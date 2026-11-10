import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { applyDiscount, normalizeDiscount } from "../services/pricing";

type ProductPriceProps = {
  price: number;
  discountPercent?: number;
  className?: string;
  compareClassName?: string;
};

/** Precio final, con el precio original tachado cuando hay descuento. */
export function ProductPrice({
  price,
  discountPercent,
  className,
  compareClassName,
}: ProductPriceProps) {
  const discount = normalizeDiscount(discountPercent);
  const finalPrice = applyDiscount(price, discount);

  return (
    <p className="flex shrink-0 flex-col items-end leading-tight">
      {discount && (
        <span className={cn("text-muted-foreground text-sm line-through", compareClassName)}>
          <span className="sr-only">Antes </span>
          {formatPrice(price)}
        </span>
      )}
      <span
        className={cn("font-heading text-brand text-lg font-extrabold tabular-nums", className)}
      >
        {discount && <span className="sr-only">Ahora </span>}
        {formatPrice(finalPrice)}
      </span>
    </p>
  );
}

type DiscountBadgeProps = {
  discountPercent?: number;
  className?: string;
};

export function DiscountBadge({ discountPercent, className }: DiscountBadgeProps) {
  const discount = normalizeDiscount(discountPercent);
  if (!discount) return null;

  return (
    <span
      className={cn(
        "bg-whatsapp text-whatsapp-foreground rounded-full px-2.5 py-1 text-xs font-extrabold shadow-md",
        className,
      )}
    >
      <span className="sr-only">Descuento de </span>-{discount}%
    </span>
  );
}
