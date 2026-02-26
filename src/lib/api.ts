const COMMERCE_URL = process.env.NEXT_PUBLIC_API_URL_COMMERCIAL

export async function getProduct(productId: string) {
  const res = await fetch(`${COMMERCE_URL}/products/${productId}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error("Failed to fetch product");
  return res.json();
}
