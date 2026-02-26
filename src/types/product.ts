export interface ProductVariant {
  variantName?: string;
  variantType?: string;
  variantValue?: string;
  variantOption: string;
  price: number;
  originalPriceWithTax?: number;
  currency?: string;
  inStock?: boolean;
}

export interface ProductContent {
  fileName: string;
}

export interface Product {
  title: string;
  description?: string;
  content?: ProductContent[];
  variants?: ProductVariant[];
  currency?: string;
  price?: number;
  originalPriceWithTax?: number;
}
