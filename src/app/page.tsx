"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [productId, setProductId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = productId.trim();
    if (id) router.push(`/product/${id}`);
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8] flex flex-col items-center justify-center p-10">
      <h1 className="text-3xl font-bold mb-4">Welcome to Naar</h1>
      <p className="text-[#787878] mb-6 font-bold">
        Browse our collection of handloom products.
      </p>
      <Link
        href="/product/697dcb8376228f3bbeca2cd5"
        className="inline-flex items-center justify-center py-4 px-8 rounded-full bg-[rgb(63,240,255)] text-black font-medium hover:opacity-90 transition-opacity"
      >
        View Sample Product
      </Link>
    </div>
  );
}
