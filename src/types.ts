export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  imageUrl: string;
  description?: string;
  tags?: string[];
  available?: boolean;
  bundleItems?: string;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
  searchQuery?: string;
}

export interface CartItem extends Product {
  quantity: number;
  selectedOptions?: { [slotIndex: number]: string };
  cartItemId?: string; // Unique ID for cart management (handles duplicate products with diff options)
}

export interface BundleSelection {
  productId: string;
  friendshipBracelet?: string;
  bearColor?: string;
}

export enum DeliveryVenue {
  B = "B - Berchmans Hall",
  BEL = "BEL - Bellarmine Hall",
  C = "C - Schmitt Hall",
  CTC = "CTC - PLDT Convergent Technologies Center",
  F = "F - Faura Hall",
  G = "G - Gonzaga Hall",
  K = "K - Kostka Hall",
  LH = "LH - Leong Hall",
  SEC_A = "SEC-A - Science Education Complex A",
  SEC_B = "SEC-B - Science Education Complex B",
  SEC_C = "SEC-C - Science Education Complex C",
  SOM = "SOM - John Gokongwei School of Management",
  SS = "SS - Social Sciences Building"
}

export interface User {
  id: string;
  email: string;
  name: string;
  photoUrl?: string;
  studentId?: string;
  contactNumber?: string;
  facebookLink?: string;
}

export interface Order extends OrderFormData {
  id: string;
  date: string;
  status: 'Pending' | 'Confirmed' | 'Ready' | 'Completed' | 'Cancelled';
  items: CartItem[];
}

export interface OrderFormData {
  // Purchaser
  email: string;
  purchaserName: string;
  studentId: string;
  contactNumber: string;
  facebookLink: string;

  // Recipient
  recipientName: string;
  recipientContact: string;
  recipientFbLink: string;
  anonymous: boolean;

  // Delivery Choice 1
  deliveryDate1: string;
  venue1: string;
  room1: string;
  time1: string;

  // Delivery Choice 2
  deliveryDate2: string;
  venue2: string;
  room2: string;
  time2: string;

  // Bundles
  bundleSelections: BundleSelection[];

  // Extra
  advocacyRosesDonation: number;
  messageForBeneficiary: string;
  messageForRecipient: string;
  specialRequests: string;

  // Payment
  totalAmount: number;
  // Output for API
  bundleDetails?: string;
  proofOfPaymentFile?: File | null;
}