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
}

export interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface OrderPayload {
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
  venue1: string;
  room1: string;
  time1: string;
  deliveryDate2: string;
  venue2: string;
  room2: string;
  time2: string;
  cartItems: string;
  bundleDetails: string;
  advocacyDonation: number;
  msgBeneficiary: string;
  msgRecipient: string;
  notes: string;
  total: number;
  items?: { id: string; quantity: number }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  cacheAge?: number;
}

export interface FilterOptions {
  categories: string[];
  tags: string[];
  priceRange: {
    min: number;
    max: number;
  };
}
