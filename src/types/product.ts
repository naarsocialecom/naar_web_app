export interface ProductVariant {
  _id?: string;
  variantName?: string;
  variantType?: string;
  variantValue?: string;
  variantOption: string;
  price: number;
  originalPriceWithTax?: number;
  currency?: string;
  inStock?: boolean;
  quantity?: number; // max available for this variant
}

export interface ProductContent {
  fileName: string;
}

export interface Product {
  _id?: string;
  title: string;
  description?: string;
  content?: ProductContent[];
  variants?: ProductVariant[];
  currency?: string;
  price?: number;
  originalPriceWithTax?: number;
}
