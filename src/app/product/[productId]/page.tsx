import Link from "next/link";
import type { Metadata } from "next";
import { getProduct } from "@/lib/api-client";
import { ENV } from "@/lib/env";
import ProductClient from "./ProductClient";

function getProductImageUrl(imgBase: string, fileName: string): string {
  if (!imgBase || !fileName) return "";
  return `${imgBase}${imgBase.endsWith("/") ? "" : "/uploads/products/"}${fileName}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ productId: string }>;
}): Promise<Metadata> {
  const { productId } = await params;
  let product;
  try {
    product = await getProduct(productId);
  } catch {
    return { title: "Product | Naar" };
  }

  const imgBase =
    process.env.NEXT_PUBLIC_S3_BASE_URL ||
    process.env.NEXT_PUBLIC_PRODUCT_IMG_BASE_URL ||
    "";
  const firstImage = product.content?.[0]?.fileName;
  const ogImageRaw = firstImage ? getProductImageUrl(imgBase, firstImage) : "/logo.svg";
  const ogImage = ogImageRaw.startsWith("http") ? ogImageRaw : `${ENV.SITE_URL}${ogImageRaw}`;
  const title = product.title ? `${product.title} | Naar` : "Product | Naar";
  const description =
    product.description?.slice(0, 160) || "Handloom products from Naar. Shop authentic crafts.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage }],
      url: `${ENV.SITE_URL}/product/${productId}`,
      siteName: "Naar",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

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
      productId={productId}
      imgBase={imgBase}
    />
  );
}
