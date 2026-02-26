import Link from "next/link";
import { getProduct } from "@/lib/api";
import ProductClient from "./ProductClient";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  let product;

  try {
    product = await getProduct(productId);
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f8f8]">
        <div className="text-center">
          <p className="text-red-600 mb-4">Product not found</p>
          <Link href="/" className="text-[#09f] underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const imgBase =
    process.env.NEXT_PUBLIC_S3_BASE_URL ||
    process.env.NEXT_PUBLIC_PRODUCT_IMG_BASE_URL ||
    "";

  return (
    <ProductClient
      product={product}
      imgBase={imgBase}
    />
  );
}
