import Image from "next/image";
import { Hamburger } from "lucide-react";
import { cn } from "@/lib/utils";

type ProductImageProps = {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  preload?: boolean;
};

/** Imagen de producto que acepta fotos remotas, fotos subidas (data URL) o ninguna. */
export function ProductImage({ src, alt, sizes, className, preload }: ProductImageProps) {
  if (!src) {
    return (
      <div
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        className="bg-accent text-accent-foreground absolute inset-0 grid place-items-center"
      >
        <Hamburger aria-hidden="true" className="size-1/3 max-h-16 max-w-16 opacity-70" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      unoptimized={src.startsWith("data:")}
      className={cn("object-cover", className)}
    />
  );
}
