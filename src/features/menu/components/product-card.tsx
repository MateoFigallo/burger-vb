"use client";

import { motion } from "motion/react";
import { ProductImage } from "@/components/product-image";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/features/cart";
import { cn } from "@/lib/utils";
import type { Product } from "../types";
import { getFinalPrice } from "../services/pricing";
import { DiscountBadge, ProductPrice } from "./product-price";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="group bg-card hover:shadow-primary/10 flex h-full flex-col overflow-hidden rounded-3xl border shadow-sm transition-shadow hover:shadow-xl"
    >
      <div className="bg-muted relative aspect-4/3 overflow-hidden">
        <ProductImage
          src={product.image}
          alt={product.name}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className={cn(
            "transition-transform duration-500 ease-out group-hover:scale-105",
            !product.available && "grayscale",
          )}
        />
        {product.badge && product.available && (
          <Badge className="absolute top-3 left-3 h-6 px-2.5 shadow-md">{product.badge}</Badge>
        )}
        {product.available && (
          <DiscountBadge
            discountPercent={product.discountPercent}
            className="absolute top-3 right-3"
          />
        )}
        {!product.available && (
          <div className="absolute inset-0 grid place-items-center bg-black/45">
            <span className="bg-background text-foreground rounded-full px-4 py-1.5 text-sm font-bold">
              Agotado
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg leading-tight font-bold">{product.name}</h3>
          <ProductPrice price={product.price} discountPercent={product.discountPercent} />
        </div>
        <p className="text-muted-foreground text-sm text-pretty">{product.description}</p>
        <div className="mt-auto pt-3">
          <AddToCartButton
            product={{
              id: product.id,
              name: product.name,
              price: getFinalPrice(product),
              image: product.image,
            }}
            disabled={!product.available}
          />
        </div>
      </div>
    </motion.article>
  );
}
