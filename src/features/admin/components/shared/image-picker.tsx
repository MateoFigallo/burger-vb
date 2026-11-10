"use client";

import { useId, useState } from "react";
import { ImageUp, LoaderCircle, Trash } from "lucide-react";
import { toast } from "sonner";
import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";
import { resizeImageFile } from "@/lib/image";

type ImagePickerProps = {
  value: string;
  onChange: (value: string) => void;
};

export function ImagePicker({ value, onChange }: ImagePickerProps) {
  const inputId = useId();
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setLoading(true);
    try {
      onChange(await resizeImageFile(file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar la imagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="bg-muted relative aspect-4/3 w-32 shrink-0 overflow-hidden rounded-xl border">
        <ProductImage src={value} alt="" sizes="128px" />
        {loading && (
          <div className="bg-background/70 absolute inset-0 grid place-items-center">
            <LoaderCircle aria-hidden="true" className="text-brand size-6 animate-spin" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="peer sr-only"
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <label
          htmlFor={inputId}
          className="hover:bg-muted peer-focus-visible:ring-ring/50 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors peer-focus-visible:ring-3"
        >
          <ImageUp aria-hidden="true" className="size-4" />
          {value ? "Cambiar foto" : "Subir foto"}
        </label>
        {value && (
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground h-11 justify-start rounded-xl px-4"
            onClick={() => onChange("")}
          >
            <Trash aria-hidden="true" className="size-4" />
            Quitar foto
          </Button>
        )}
      </div>
    </div>
  );
}
