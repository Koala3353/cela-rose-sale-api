import { google } from 'googleapis';
import { Readable } from 'stream';
import { Product, FilterOptions } from './types';

// Order write queue
type OrderWriteTask = {
  sheetId: string;
  sheetName: string;
  rows: string[][];
  resolve: (value: boolean) => void;
  reject: (reason?: any) => void;
};
const orderWriteQueue: OrderWriteTask[] = [];
let orderWriteActive = false;

async function processOrderQueue() {
  if (orderWriteActive || orderWriteQueue.length === 0) return;
  orderWriteActive = true;
  while (orderWriteQueue.length > 0) {
    // Batch all tasks currently in the queue
    const batch: OrderWriteTask[] = [];
    while (orderWriteQueue.length > 0) {
      batch.push(orderWriteQueue.shift()!);
    }
    if (batch.length === 0) break;
    // Assume all tasks are for the same sheet/tab
    const sheetId = batch[0].sheetId;
    const sheetName = batch[0].sheetName;
    const allRows = batch.flatMap(task => task.rows);
    let attempts = 0;
    let success = false;
    while (attempts < 3 && !success) {
      try {
        await appendToSheet(sheetId, sheetName, allRows, false); // direct write, no queue
        success = true;
        batch.forEach(task => task.resolve(true));
      } catch (err) {
        attempts++;
        if (attempts >= 3) {
          batch.forEach(task => task.reject(err));
        } else {
          await new Promise(res => setTimeout(res, 1000 * attempts));
        }
      }
    }
    await new Promise(res => setTimeout(res, 500));
  }
  orderWriteActive = false;
}

export function queueOrderWrite(sheetId: string, sheetName: string, rows: string[][]): Promise<boolean> {
  return new Promise((resolve, reject) => {
    orderWriteQueue.push({ sheetId, sheetName, rows, resolve, reject });
    processOrderQueue();
  });
}

// Include write scope for appending orders and Drive for file uploads
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

/**
 * Build an auth client using a service account (preferred for private sheets),
 * or null when falling back to API key (public sheets).
 *
 * Supported env vars:
 * - GOOGLE_SERVICE_ACCOUNT_KEY_BASE64  (base64-encoded JSON key)
 * - GOOGLE_SERVICE_ACCOUNT_FILE         (path to JSON key file)
 */
function getServiceAccountAuth() {
  const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_FILE;

  try {
    if (keyBase64) {
      const json = JSON.parse(Buffer.from(keyBase64, 'base64').toString('utf8'));
      console.log('[Sheets] Using service account:', json.client_email);
      return new google.auth.GoogleAuth({
        credentials: json,
        scopes: SCOPES
      });
    }

    if (keyFile) {
      console.log('[Sheets] Using service account file:', keyFile);
      return new google.auth.GoogleAuth({
        keyFile,
        scopes: SCOPES
      });
    }
  } catch (err) {
    console.error('[Sheets] Failed to initialize service account auth:', err);
  }

  console.log('[Sheets] No service account configured, using API key fallback');
  return null;
}

// Lazy initialization - only get auth when first needed
let serviceAuth: ReturnType<typeof getServiceAccountAuth> | undefined;
let authInitialized = false;

function getAuth() {
  if (!authInitialized) {
    serviceAuth = getServiceAccountAuth();
    authInitialized = true;
  }
  return serviceAuth;
}

/**
 * Fetch raw data from a Google Sheet
 * If a service account is configured, requests are authenticated and can access
 * private sheets shared with the service account email. Otherwise falls back
 * to API key (for public sheets).
 */
export async function fetchSheetData(
  sheetId: string,
  sheetName: string,
  apiKey?: string
): Promise<string[][]> {
  try {
    const auth = getAuth();
    let sheetsClient;

    if (auth) {
      const client = await auth.getClient();
      // cast auth client to any to satisfy TypeScript overloads
      sheetsClient = google.sheets({ version: 'v4', auth: client as any });
    } else {
      sheetsClient = google.sheets({ version: 'v4' });
    }

    const params: any = {
      spreadsheetId: sheetId,
      range: sheetName
    };

    // If no service auth is available, use API key for public sheets
    if (!auth && apiKey) params.key = apiKey;

    const response = await sheetsClient.spreadsheets.values.get(params);
    return response.data.values || [];
  } catch (error: any) {
    // Log full error and API response (if present) to help diagnose permission issues
    console.error('[Sheets] Error fetching data:', error);
    if (error && error.response && error.response.data) {
      console.error('[Sheets] API response data:', error.response.data);
    }
    throw new Error(`Failed to fetch sheet data: ${error.message || String(error)}`);
  }
}

/**
 * Parse raw sheet data into Product objects
 * Expected columns: id, name, price, category, stock, imageUrl, description, tags, available
 */
export function parseProductsData(values: string[][]): Product[] {
  if (!values || values.length < 2) {
    console.warn('[Sheets] No data or only headers found');
    return [];
  }

  const headers = values[0].map(h => h.toLowerCase().trim());
  const products: Product[] = [];

  // Map header names to indices
  const getIndex = (name: string): number => {
    const variations: { [key: string]: string[] } = {
      id: ['id', 'product_id', 'productid', 'sku'],
      name: ['name', 'product_name', 'productname', 'title'],
      price: ['price', 'cost', 'amount'],
      category: ['category', 'type', 'group'],
      stock: ['stock', 'quantity', 'qty', 'inventory'],
      imageurl: ['imageurl', 'image_url', 'image', 'img', 'photo'],
      description: ['description', 'desc', 'details'],
      tags: ['tags', 'labels', 'keywords'],
      available: ['available', 'active', 'enabled', 'visible', 'show']
    };

    for (const variant of variations[name] || [name]) {
      const idx = headers.indexOf(variant);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const indices = {
    id: getIndex('id'),
    name: getIndex('name'),
    price: getIndex('price'),
    category: getIndex('category'),
    stock: getIndex('stock'),
    imageUrl: getIndex('imageurl'),
    description: getIndex('description'),
    tags: getIndex('tags'),
    available: getIndex('available')
  };

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || row.length === 0) continue;

    const getValue = (idx: number): string => (idx >= 0 && row[idx]) ? row[idx].trim() : '';

    const id = getValue(indices.id);
    const name = getValue(indices.name);

    // Skip rows without required fields
    if (!id || !name) continue;

    const availableValue = getValue(indices.available).toLowerCase();
    const isAvailable = availableValue !== 'false' && availableValue !== 'no' && availableValue !== '0';

    const product: Product = {
      id,
      name,
      price: parseFloat(getValue(indices.price)) || 0,
      category: getValue(indices.category) || 'Uncategorized',
      stock: parseInt(getValue(indices.stock)) || 0,
      imageUrl: getValue(indices.imageUrl) || `https://picsum.photos/seed/${id}/300/300`,
      description: getValue(indices.description) || undefined,
      tags: getValue(indices.tags)
        ? getValue(indices.tags).split(',').map(t => t.trim()).filter(Boolean)
        : undefined,
      available: isAvailable
    };

    products.push(product);
  }

  console.log(`[Sheets] Parsed ${products.length} products from sheet`);
  return products;
}

/**
 * Extract filter options from products
 */
export function extractFilterOptions(products: Product[]): FilterOptions {
  const categories = [...new Set(products.map(p => p.category))].sort();
  const allTags = products.flatMap(p => p.tags || []);
  const tags = [...new Set(allTags)].sort();

  const prices = products.map(p => p.price).filter(p => p > 0);
  const priceRange = {
    min: prices.length > 0 ? Math.min(...prices) : 0,
    max: prices.length > 0 ? Math.max(...prices) : 0
  };

  return { categories, tags, priceRange };
}

/**
 * Append rows to a Google Sheet (for orders)
 * Requires service account with write access to the sheet
 */
// Use queue for order writes, direct for others
export async function appendToSheet(sheetId: string, sheetName: string, rows: string[][], useQueue = false): Promise<boolean> {
  if (useQueue && sheetName.toLowerCase().includes('order')) {
    return queueOrderWrite(sheetId, sheetName, rows);
  }
  try {
    const auth = getAuth();
    if (!auth) throw new Error('No Google Sheets auth available');
    const sheetsClient = google.sheets({ version: 'v4', auth });
    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: sheetName,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows,
      },
    });
    return true;
  } catch (error: any) {
    console.error('[Sheets] Error appending to sheet:', error);
    throw error;
  }
}

/**
 * Upload a file to Google Drive and return a shareable link
 * The file will be uploaded to a folder (if GOOGLE_DRIVE_FOLDER_ID is set)
 * and made publicly viewable
 */
export async function uploadFileToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  try {
    const auth = getAuth();

    if (!auth) {
      throw new Error('Service account required for uploading to Drive');
    }

    const client = await auth.getClient();
    const driveClient = google.drive({ version: 'v3', auth: client as any });

    // Convert buffer to readable stream
    const stream = new Readable();
    stream.push(fileBuffer);
    stream.push(null);

    // File metadata
    const fileMetadata: any = {
      name: fileName,
    };

    // Optionally put in a specific folder
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    // Upload the file
    const response = await driveClient.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: mimeType,
        body: stream,
      },
      fields: 'id, webViewLink, webContentLink',
    });

    const fileId = response.data.id;

    if (!fileId) {
      throw new Error('No file ID returned from upload');
    }

    // Make the file publicly viewable
    await driveClient.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Get the shareable link
    const fileLink = `https://drive.google.com/file/d/${fileId}/view`;

    console.log('[Drive] Uploaded file:', fileName, '-> ', fileLink);

    return fileLink;
  } catch (error: any) {
    console.error('[Drive] Error uploading file:', error);
    if (error.response?.data) {
      console.error('[Drive] API response:', error.response.data);
    }
    throw new Error(`Failed to upload file to Drive: ${error.message}`);
  }
}

/**
 * Order data structure matching the Orders sheet columns
 */
export interface SheetOrder {
  orderId: string;
  timestamp: string;
  email: string;
  purchaserName: string;
  studentId: string;
  contactNumber: string;
  facebookLink: string;
  recipientName: string;
  recipientContact: string;
  recipientFbLink: string;
  anonymous: boolean;
  deliveryDate1: string;
  time1: string;
  venue1: string;
  room1: string;
  deliveryDate2: string;
  time2: string;
  venue2: string;
  room2: string;
  cartItems: string;
  bundleDetails: string;
  advocacyDonation: number;
  msgBeneficiary: string;
  msgRecipient: string;
  notes: string;
  total: number;
  payment: number;
  status: string;
  assignedDoveEmail: string;
}

/**
 * Fetch orders from the orders sheet filtered by user email
 */
export async function fetchUserOrdersFromSheet(
  sheetId: string,
  sheetName: string,
  userEmail: string,
  apiKey?: string
): Promise<SheetOrder[]> {
  try {
    const rawData = await fetchSheetData(sheetId, sheetName, apiKey);

    if (!rawData || rawData.length < 2) {
      console.log('[Sheets] No orders found in sheet');
      return [];
    }

    const headers = rawData[0].map(h => h.toLowerCase().trim().replace(/\s+/g, ''));

    // Map header names to indices
    const getIndex = (names: string[]): number => {
      for (const name of names) {
        const idx = headers.findIndex(h => h.includes(name.toLowerCase()));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const indices = {
      orderId: getIndex(['orderid', 'order_id', 'id']),
      timestamp: getIndex(['timestamp', 'date', 'created']),
      email: getIndex(['email']),
      purchaserName: getIndex(['purchasername', 'name', 'buyer']),
      studentId: getIndex(['studentid', 'student_id']),
      contactNumber: getIndex(['contactnumber', 'contact', 'phone']),
      facebookLink: getIndex(['facebooklink', 'facebook', 'fb']),
      recipientName: getIndex(['recipientname', 'recipient']),
      recipientContact: getIndex(['recipientcontact']),
      recipientFbLink: getIndex(['recipientfblink', 'recipientfb']),
      anonymous: getIndex(['anonymous']),
      deliveryDate1: getIndex(['deliverydate1', 'delivery1']),
      time1: getIndex(['time1']),
      venue1: getIndex(['venue1']),
      room1: getIndex(['room1']),
      deliveryDate2: getIndex(['deliverydate2', 'delivery2']),
      time2: getIndex(['time2']),
      venue2: getIndex(['venue2']),
      room2: getIndex(['room2']),
      cartItems: getIndex(['cartitems', 'items', 'cart']),
      bundleDetails: getIndex(['bundledetails', 'bundles']),
      advocacyDonation: getIndex(['advocacydonation', 'donation']),
      msgBeneficiary: getIndex(['messageforbeneficiary', 'msgbeneficiary', 'beneficiarymessage']),
      msgRecipient: getIndex(['messageforrecipient', 'msgrecipient', 'recipientmessage']),
      notes: getIndex(['notes', 'specialrequests']),
      total: getIndex(['total', 'amount', 'price']),
      payment: 20, // Column U (21st column, 0-indexed = 20)
      status: getIndex(['status']),
      assignedDoveEmail: getIndex(['assigneddoveemail', 'assigneddove', 'dove'])
    };

    const orders: SheetOrder[] = [];
    const normalizedUserEmail = userEmail.toLowerCase().trim();

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      const getValue = (idx: number): string => (idx >= 0 && row[idx]) ? row[idx].trim() : '';

      const orderEmail = getValue(indices.email).toLowerCase().trim();

      // Filter by user email
      if (orderEmail !== normalizedUserEmail) continue;

      const order: SheetOrder = {
        orderId: getValue(indices.orderId),
        timestamp: getValue(indices.timestamp),
        email: getValue(indices.email),
        purchaserName: getValue(indices.purchaserName),
        studentId: getValue(indices.studentId),
        contactNumber: getValue(indices.contactNumber),
        facebookLink: getValue(indices.facebookLink),
        recipientName: getValue(indices.recipientName),
        recipientContact: getValue(indices.recipientContact),
        recipientFbLink: getValue(indices.recipientFbLink),
        anonymous: getValue(indices.anonymous).toLowerCase() === 'yes',
        deliveryDate1: getValue(indices.deliveryDate1),
        time1: getValue(indices.time1),
        venue1: getValue(indices.venue1),
        room1: getValue(indices.room1),
        deliveryDate2: getValue(indices.deliveryDate2),
        time2: getValue(indices.time2),
        venue2: getValue(indices.venue2),
        room2: getValue(indices.room2),
        cartItems: getValue(indices.cartItems),
        bundleDetails: getValue(indices.bundleDetails),
        advocacyDonation: parseFloat(getValue(indices.advocacyDonation)) || 0,
        msgBeneficiary: getValue(indices.msgBeneficiary),
        msgRecipient: getValue(indices.msgRecipient),
        notes: getValue(indices.notes),
        total: parseFloat(getValue(indices.total)) || 0,
        payment: parseFloat(getValue(indices.payment)) || 0,
        status: getValue(indices.status) || 'Pending',
        assignedDoveEmail: getValue(indices.assignedDoveEmail)
      };

      orders.push(order);
    }

    console.log(`[Sheets] Found ${orders.length} orders for ${userEmail}`);
    return orders;
  } catch (error: any) {
    console.error('[Sheets] Error fetching user orders:', error);
    throw new Error(`Failed to fetch user orders: ${error.message}`);
  }
}

/**
 * Updates stock counts for multiple products in a single batch request.
 */
export async function updateStockCounts(
  sheetId: string,
  sheetName: string,
  stockUpdates: Map<string, number> // Map of productId -> newStock
): Promise<boolean> {
  const auth = getAuth();
  if (!auth) {
    throw new Error('Service account required for writing to sheets.');
  }

  try {
    const client = await auth.getClient();
    const sheetsClient = google.sheets({ version: 'v4', auth: client as any });

    // 1. Fetch the current sheet data to find row numbers and stock column index
    const rawData = await fetchSheetData(sheetId, sheetName);
    const headers = rawData[0].map(h => h.toLowerCase().trim());

    const idColIndex = headers.indexOf('id');
    const stockColIndex = headers.indexOf('stock');

    if (idColIndex === -1 || stockColIndex === -1) {
      throw new Error('Could not find "id" or "stock" column in the products sheet.');
    }

    // 2. Prepare the data for batch update
    const data: any[] = [];
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      const productId = row[idColIndex];

      if (stockUpdates.has(productId)) {
        const newStock = stockUpdates.get(productId);
        const range = `${sheetName}!${String.fromCharCode(65 + stockColIndex)}${i + 1}`;
        data.push({
          range: range,
          values: [[newStock]],
        });
      }
    }

    if (data.length === 0) {
      console.log('[Sheets] No stock updates to perform.');
      return true;
    }

    // 3. Execute the batch update
    const response = await sheetsClient.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: data,
      },
    });

    console.log(`[Sheets] Batch updated stock for ${response.data.totalUpdatedCells} product(s).`);
    return true;

  } catch (error: any) {
    console.error('[Sheets] Error updating stock counts:', error);
    if (error.response?.data) {
      console.error('[Sheets] API response:', error.response.data);
    }
    throw new Error(`Failed to update stock counts: ${error.message}`);
  }
}
