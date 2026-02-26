"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import type { Product, ProductVariant } from "@/types/product";
import CheckoutFlow from "@/components/checkout/CheckoutFlow";

const MAX_DESC_LENGTH = 150;

function getImageUrl(imgBase: string, fileName: string): string {
  if (!imgBase || !fileName) return "";
  return `${imgBase}${imgBase.endsWith("/") ? "" : "/uploads/products/"}${fileName}`;
}

function getVariantLabel(v: ProductVariant): string {
  if (v.variantType === "unitOfMeasure" && v.variantValue) {
    return `${v.variantValue} ${v.variantOption}`;
  }
  return v.variantOption;
}

function isSingleDefaultVariant(variants: ProductVariant[]): boolean {
  if (!variants || variants.length !== 1) return false;
  const v = variants[0];
  return v.variantName === "default" && v.variantType === "default";
}

const FRAME_IMGS = ["/frame1.jpeg", "/frame2.jpeg", "/frame3.jpeg", "/frame4.jpeg", "/frame5.jpeg", "/frame6.jpeg"];

const GAP = 0;
const BASE_H = 370;
const BASE_W = 260;
const SET_SIZE = FRAME_IMGS.length * BASE_W + (FRAME_IMGS.length - 1) * GAP;

function GlobeCarousel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transforms, setTransforms] = useState<{ scale: number; rotateY: number }[]>([]);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const dragStart = useRef({ x: 0, scroll: 0 });
  const isLooping = useRef(false);

  useEffect(() => {
    if (!isGrabbing) return;
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      containerRef.current.scrollLeft = dragStart.current.scroll - (e.clientX - dragStart.current.x);
    };
    const onUp = () => setIsGrabbing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isGrabbing]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragStart.current = { x: e.clientX, scroll: containerRef.current?.scrollLeft ?? 0 };
    setIsGrabbing(true);
  };

  const updateTransforms = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const viewW = el.clientWidth;
    const viewCenter = scrollLeft + viewW / 2;
    const children = Array.from(el.children) as HTMLElement[];
    const newTransforms = children.map((child) => {
      const left = child.offsetLeft;
      const imgCenter = left + BASE_W / 2;
      const offset = (imgCenter - viewCenter) / viewW;
      const dist = Math.abs(offset);
      const t = Math.min(dist * 2, 1);
      const scale = 0.42 + t * 0.58;
      const rotateY = -offset * 28;
      return { scale, rotateY };
    });
    setTransforms(newTransforms);
  }, []);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || isLooping.current) return;
    const sl = el.scrollLeft;
    const setW = SET_SIZE;
    if (sl < 50) {
      isLooping.current = true;
      el.scrollLeft = sl + setW;
      requestAnimationFrame(() => {
        isLooping.current = false;
      });
    } else if (sl > setW * 2 - 50) {
      isLooping.current = true;
      el.scrollLeft = sl - setW;
      requestAnimationFrame(() => {
        isLooping.current = false;
      });
    }
    updateTransforms();
  }, [updateTransforms]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollLeft = SET_SIZE;
    updateTransforms();
    el.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", updateTransforms);
    const ro = new ResizeObserver(updateTransforms);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateTransforms);
      ro.disconnect();
    };
  }, [handleScroll, updateTransforms]);

  const imgs = [...FRAME_IMGS, ...FRAME_IMGS, ...FRAME_IMGS];

  return (
    <div className="mt-16 w-full overflow-hidden select-none" style={{ touchAction: "pan-x" }}>
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        className={`flex items-center justify-center gap-0 overflow-x-auto overflow-y-visible py-12 scrollbar-hide ${isGrabbing ? "cursor-grabbing" : "cursor-grab"}`}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          perspective: "1200px",
        }}
      >
        {imgs.map((src, i) => {
          const t = transforms[i] ?? { scale: 0.5, rotateY: 0 };
          return (
            <div
              key={i}
              className="flex-shrink-0 flex items-center justify-center"
              style={{
                width: BASE_W,
                height: BASE_H,
                perspective: "1200px",
              }}
            >
              <div
                className="w-full overflow-hidden rounded-[20px] will-change-transform"
                style={{
                  height: BASE_H,
                  transform: `perspective(1000px) rotateY(${t.rotateY}deg) scale(${t.scale})`,
                  transformOrigin: "center center",
                }}
              >
                <Image
                  src={src}
                  alt={`Frame ${(i % 6) + 1}`}
                  width={BASE_W}
                  height={BASE_H}
                  className="object-cover w-full h-full"
                  draggable={false}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ProductClientProps {
  product: Product;
  productId: string;
  imgBase: string;
}

export default function ProductClient({ product, productId, imgBase }: ProductClientProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const content = product.content || [];
  const imageFiles = content.map((c) => c.fileName);
  const mainImageUrl = imageFiles[selectedImage]
    ? getImageUrl(imgBase, imageFiles[selectedImage])
    : null;

  const variants = product.variants || [];
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const selectedVariant = variants[selectedVariantIndex] ?? variants[0];
  const maxQuantity = selectedVariant?.quantity ?? (selectedVariant?.inStock !== false ? 99 : 0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setQuantity((q) => (maxQuantity === 0 ? 0 : Math.min(Math.max(q, 1), maxQuantity)));
  }, [selectedVariantIndex, maxQuantity]);

  const currency = selectedVariant?.currency ?? product.currency ?? "₹";
  const currentPrice =
    selectedVariant?.price ?? product.price ?? 0;
  const originalPrice =
    selectedVariant?.originalPriceWithTax ?? product.originalPriceWithTax ?? 0;
  const showStrikePrice = originalPrice > 0 && originalPrice > currentPrice;

  const description = product.description || "";
  const shortDescription =
    description.length > MAX_DESC_LENGTH
      ? description.slice(0, MAX_DESC_LENGTH).trim() + "... "
      : description;
  const hasMoreDesc = description.length > MAX_DESC_LENGTH;
  const showDescExpanded = !hasMoreDesc || descriptionExpanded;

  const showVariantSelector =
    variants.length > 0 && !isSingleDefaultVariant(variants);
  const variantLabel = variants[0]?.variantName;

  const [showCheckout, setShowCheckout] = useState(false);
  const productForCheckout = { ...product, _id: product._id || productId };

  return (
    <div className="min-h-screen bg-[#f8f8f8] pt-20 pb-0">
      <header className="bg-[#f8f8f8] pt-8 pb-20">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative order-1">
              <div className="relative w-full aspect-[575/651] rounded-xl overflow-hidden bg-white">
                {mainImageUrl ? (
                  <Image
                    src={mainImageUrl}
                    alt={product.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-[#ececea] flex items-center justify-center text-[#787878]">
                    No image
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-white rounded-full px-3 py-2 flex items-center gap-2 shadow-sm">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                  <span className="text-xs font-bold">New</span>
                </div>
              </div>
              {imageFiles.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4">
                  <div className="flex gap-2 overflow-x-auto justify-center bg-white backdrop-blur-md rounded-xl p-1">
                    {imageFiles.slice(0, 5).map((fileName, i) => {
                      const isActive = selectedImage === i;

                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedImage(i)}
                          className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-300 ease-in-out
                      ${isActive ? "w-20 h-16 border-black shadow-md z-10" : "w-16 h-16 border-white opacity-80 hover:opacity-100"}
                    `}
                        >
                          <Image
                            src={getImageUrl(imgBase, fileName)}
                            alt=""
                            width={80}
                            height={80}
                            className="object-cover w-full h-full"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6 order-2">
              <div>
                <h1 className="text-[44px] font-bold tracking-[-0.03em] leading-[1.18] text-black mb-4">
                  {product.title}
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  {showStrikePrice && (
                    <p className="text-lg text-[#a1a1a1] line-through font-semibold">
                      {currency}
                      {originalPrice}
                    </p>
                  )}
                  <p className="text-2xl font-bold text-black">
                    {currency}
                    {currentPrice}
                  </p>
                </div>
              </div>

              <p className="text-lg text-[#787878] leading-[1.5] tracking-[-0.03em] font-medium">
                {showDescExpanded ? description : shortDescription}
                {hasMoreDesc && !descriptionExpanded && (
                  <button
                    type="button"
                    onClick={() => setDescriptionExpanded(true)}
                    className="text-[#09f] font-semibold ml-1 hover:underline"
                  >
                    View More
                  </button>
                )}
              </p>

              {showVariantSelector && variantLabel && (
                <div className="space-y-2">
                  <p className="font-bold text-black">
                    Select {variantLabel}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((v, i) => {
                      const inStock = v.inStock !== false;
                      const isSelected = selectedVariantIndex === i;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedVariantIndex(i)}
                          disabled={!inStock}
                          className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                            !inStock
                              ? "opacity-50 text-[#a1a1a1] border-[#a1a1a1] cursor-not-allowed"
                              : isSelected
                                ? "border-black bg-[#f8f8f8] text-black"
                                : "border-[rgba(0,0,0,0.2)] text-black hover:border-black"
                          }`}
                        >
                          {getVariantLabel(v)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                <p className="font-bold text-black">Quantity</p>
                <div className="flex items-center border-2 border-[rgba(0,0,0,0.2)] rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-12 h-12 flex items-center justify-center bg-[#f8f8f8] hover:bg-[#ececea] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#f8f8f8] transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="w-12 h-12 flex items-center justify-center font-bold text-lg border-x border-[rgba(0,0,0,0.1)]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                    disabled={quantity >= maxQuantity}
                    className="w-12 h-12 flex items-center justify-center bg-[#f8f8f8] hover:bg-[#ececea] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#f8f8f8] transition-colors"
                    aria-label="Increase quantity"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCheckout(true)}
                className="inline-flex items-center justify-center w-full py-4 px-6 rounded-full bg-[rgb(63,240,255)] text-black font-bold text-lg tracking-[-0.035em] hover:opacity-90 transition-opacity"
              >
                Buy Now
              </button>
              {showCheckout && (
                <CheckoutFlow
                  product={productForCheckout}
                  selectedVariant={selectedVariant}
                  quantity={quantity}
                  onClose={() => setShowCheckout(false)}
                />
              )}

              <p className="text-lg text-black font-bold mb-2 md:mb-6">
                Install Naar App to{" "}
                <span className="font-extrabold">Get ₹200 Offer</span>
              </p>

              {/* MATERIAL */}
              <div className="flex flex-col md:flex-row md:items-center items-start">
                <div className="flex items-center gap-3 md:gap-4 md:min-w-[180px] w-full md:w-auto">
                  <svg
                    className="w-4 h-4 text-black flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.7}
                      d="M20 7l-8-4-8 4v10l8 4 8-4V7z"
                    />
                  </svg>
                  <p className="text-md font-semibold text-black">Material</p>
                </div>

                <p className="text-md text-[#6e6e6e] font-medium mt-2 md:mt-0 md:ml-4">
                  Premium four way stretch polyurethane
                </p>
              </div>

              <div className="w-full h-px bg-gray-300" />

              {/* CARE */}
              <div className="flex flex-col md:flex-row md:items-center items-start">
                <div className="flex items-center gap-3 md:gap-4 md:min-w-[180px] w-full md:w-auto">
                  <svg
                    className="w-5 h-5 text-black flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.7}
                      d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z"
                    />
                  </svg>
                  <p className="text-md font-semibold text-black">Care</p>
                </div>

                <p className="text-md text-[#6e6e6e] font-medium mt-2 md:mt-0 md:ml-4">
                  Hand wash cold, air dry
                </p>
              </div>

              <div className="w-full h-px bg-gray-300" />
              {/* WARRANTY */}
              <div className="flex flex-col md:flex-row md:items-center items-start">
                <div className="flex items-center gap-3 md:gap-4 md:min-w-[180px] w-full md:w-auto">
                  <svg
                    className="w-5 h-5 text-black flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.7}
                      d="M9 12l2 2 4-4"
                    />
                  </svg>
                  <p className="text-md font-semibold text-black">Warranty</p>
                </div>

                <p className="text-md text-[#6e6e6e] font-medium mt-2 md:mt-0 md:ml-4">
                  Anti-peel and crack surface guarantee
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-12 w-full">
            {[
              {
                icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
                title: "Trusted Quality",
                desc: "Authentic handloom product crafted with durable stitching and secure zip closure.",
              },
              {
                icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
                title: "Quality Checked",
                desc: "Each piece is inspected to ensure proper finish and stitching standards.",
              },
              {
                icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
                title: "Secure Payments",
                desc: "Shop confidently with safe and encrypted checkout.",
              },
              {
                icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4",
                title: "Reliable Shipping",
                desc: "Carefully packed and delivered safely to your doorstep.",
              },
            ].map((card, i) => (
              <div
                key={i}
                className="bg-[#ececea] rounded-xl p-5 flex flex-col gap-4"
              >
                <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-black"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={card.icon}
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-xl text-black mb-1">
                    {card.title}
                  </p>
                  <p className="text-base text-[#787878] leading-relaxed font-medium">
                    {card.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="py-20 bg-[#f8f8f8]">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 mb-6">
            <div className="w-4 h-4 rounded-full bg-black" />
            <span className="text-sm font-bold">Join the Movement</span>
          </div>
          <h2 className="text-[48px] font-bold tracking-[-0.03em] leading-[1.165] text-black mb-5 max-w-[550px] mx-auto">
            Shop Local. Sell Live. Make Commerce Human.
          </h2>
          <p className="text-base text-[#6e6e6e] leading-[1.55] max-w-[450px] mx-auto mb-8 font-medium">
            Discover real sellers, authentic products, and live shopping
            experiences, all in one place. Download the Naar app and be part of
            a new way to buy and sell.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://apps.apple.com/in/app/naar/id6745104566"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Image
                src="https://framerusercontent.com/images/qNekEdbtA4tQDyLmi1H27TfUmbA.svg"
                alt="App Store"
                width={131}
                height={40}
                unoptimized
              />
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.naar.io"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Image
                src="https://framerusercontent.com/images/KA6FMDdZGmYbYTtLDHKrO8rM9B4.svg"
                alt="Play Store"
                width={131}
                height={40}
                unoptimized
              />
            </a>
          </div>
        </div>

        <GlobeCarousel />
      </section>

      <footer className="bg-black py-20 px-6">
        <div className="max-w-[1240px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 mb-12">
            <h4 className="text-[36px] font-bold tracking-[-0.03em] text-white max-w-[300px]">
              Subscribe to our newsletter
            </h4>
            <form className="flex gap-3 max-w-[400px] w-full">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-6 py-4 rounded-full bg-[#1f1f1f] text-white placeholder:text-white/40 text-base border-none outline-none"
              />
              <button
                type="submit"
                className="px-6 py-4 rounded-full bg-white text-black font-bold text-base cursor-pointer border-none"
              >
                Subscribe
              </button>
            </form>
          </div>
          <div className="h-px bg-white/15 mb-12" />
          <Link href="/" className="inline-block">
            <Image
              src="/logo-footer.svg"
              alt="Naar"
              width={167}
              height={60}
              className="h-10 w-auto"
            />
          </Link>
        </div>
      </footer>
    </div>
  );
}
