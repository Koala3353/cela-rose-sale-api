import { Product, FilterOptions } from './types';
export declare function queueOrderWrite(sheetId: string, sheetName: string, rows: string[][]): Promise<boolean>;
/**
 * Fetch raw data from a Google Sheet
 * If a service account is configured, requests are authenticated and can access
 * private sheets shared with the service account email. Otherwise falls back
 * to API key (for public sheets).
 */
export declare function fetchSheetData(sheetId: string, sheetName: string, apiKey?: string): Promise<string[][]>;
/**
 * Parse raw sheet data into Product objects
 * Expected columns: id, name, price, category, stock, imageUrl, description, tags, available
 */
export declare function parseProductsData(values: string[][]): Product[];
/**
 * Extract filter options from products
 */
export declare function extractFilterOptions(products: Product[]): FilterOptions;
/**
 * Append rows to a Google Sheet (for orders)
 * Requires service account with write access to the sheet
 */
export declare function appendToSheet(sheetId: string, sheetName: string, rows: string[][], useQueue?: boolean): Promise<boolean>;
/**
 * Update a specific row in a Google Sheet
 * Used for analytics to update the same row instead of appending
 */
export declare function updateSheetRow(sheetId: string, sheetName: string, rowNumber: number, values: string[]): Promise<boolean>;
/**
 * Upload a file to Google Drive and return a shareable link
 *
 * IMPORTANT: Service Accounts have no storage quota in regular Drive.
 * They can only upload to Shared Drives (Team Drives).
 *
 * Set GOOGLE_DRIVE_FOLDER_ID to a folder ID inside a Shared Drive
 * that the service account has access to.
 */
export declare function uploadFileToDrive(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string>;
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
    paymentConfirmed: boolean;
    assignedDoveEmail: string;
}
/**
 * Fetch orders from the orders sheet filtered by user email
 */
export declare function fetchUserOrdersFromSheet(sheetId: string, sheetName: string, userEmail: string, apiKey?: string): Promise<SheetOrder[]>;
/**
 * Updates stock counts for multiple products in a single batch request.
 */
export declare function updateStockCounts(sheetId: string, sheetName: string, stockUpdates: Map<string, number>): Promise<boolean>;
//# sourceMappingURL=sheets.d.ts.map