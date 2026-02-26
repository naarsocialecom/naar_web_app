export interface Address {
  _id: string;
  addressNickName: string;
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  location?: { type: "Point"; coordinates: [number, number] };
  plusCode?: string;
  isDefault?: boolean;
  phone: string;
}

export interface CheckoutEstimate {
  quoteId: string;
  productPrice: number;
  shipping: number;
  gst?: number;
  platformFees?: number;
  total: number;
  discount?: number;
  isLogisticsFree?: boolean;
  estimateLogisticsPrice?: number;
  labels?: Record<string, string>;
  logisticsOptions?: Array<{ label: string; logisticsChoice: string; deliveryText?: string }>;
  appliedCoupon?: { _id: string; code: string } | null;
  couponError?: string | null;
}

export interface CreateOrderResponse {
  orderId: string;
  razorpayOrderId: string;
  expiryTime: string;
}

export interface UserDetails {
  userId: string;
  userName?: string;
  name?: string;
  phoneNumber?: string;
  email?: string;
  categories?: string[];
}
