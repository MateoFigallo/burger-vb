"use client";

import { motion } from "motion/react";
import { Clock, ExternalLink, MapPin, Navigation, Star, Truck } from "lucide-react";
import { GoogleIcon } from "@/components/icons/google-icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getGoogleReviewUrl,
  getMapsEmbedUrl,
  getMapsSearchUrl,
  useSystem,
} from "@/features/system";
import { PAGE_CONTAINER } from "@/lib/layout";
import { useIsClient } from "@/lib/use-local-store";
import { cn } from "@/lib/utils";

export function ReviewsLocation() {
  const isHydrated = useIsClient();
  const { web } = useSystem();
  const reviewUrl = getGoogleReviewUrl(web);

  return (
    <section id="ubicacion" aria-labelledby="ubicacion-title" className="py-14 md:py-20">
      <div className={PAGE_CONTAINER}>
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-brand text-sm font-semibold tracking-widest uppercase">Visitanos</p>
          <h2 id="ubicacion-title" className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Dónde estamos y qué opinan
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Reseña Google */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="bg-card flex min-w-0 flex-col gap-5 rounded-3xl border p-6 shadow-sm sm:p-8 lg:col-span-2"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl border bg-white shadow-xs">
                <GoogleIcon className="size-6" />
              </span>
              <div className="min-w-0">
                <p className="font-bold">Reseñas en Google</p>
                <p className="text-muted-foreground text-sm">¿Ya probaste nuestras burgers?</p>
              </div>
            </div>

            <div className="flex gap-1" aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className="size-7 fill-amber-400 text-amber-400" />
              ))}
            </div>

            <p className="text-muted-foreground text-pretty">
              Tu opinión nos ayuda a mejorar y a que más gente descubra{" "}
              <strong className="text-foreground">{web.storeName}</strong>. Te toma menos de un
              minuto.
            </p>

            <Button
              size="lg"
              className="mt-auto h-12 w-full rounded-xl text-base font-semibold"
              nativeButton={false}
              render={<a href={reviewUrl} target="_blank" rel="noopener noreferrer" />}
            >
              <Star aria-hidden="true" className="size-5" />
              Dejar mi reseña en Google
              <ExternalLink aria-hidden="true" className="size-4 opacity-70" />
            </Button>
          </motion.div>

          {/* Mapa + datos */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.25, ease: "easeOut", delay: 0.05 }}
            className="bg-card min-w-0 overflow-hidden rounded-3xl border shadow-sm lg:col-span-3"
          >
            <div className="bg-muted relative aspect-[4/3] w-full sm:aspect-[16/9]">
              {isHydrated ? (
                <iframe
                  title={`Mapa de ${web.storeName}`}
                  src={getMapsEmbedUrl(web.address)}
                  className="absolute inset-0 size-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <Skeleton className="absolute inset-0 rounded-none" />
              )}
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
              {[
                { icon: MapPin, label: "Dirección", value: web.address },
                { icon: Clock, label: "Horarios", value: web.hours },
                { icon: Truck, label: "Delivery", value: web.deliveryInfo },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex min-w-0 gap-3">
                  <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs font-semibold uppercase">{label}</p>
                    <p className={cn("text-sm font-medium break-words", !value && "text-muted-foreground")}>
                      {value || "A confirmar"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t p-4 sm:px-6">
              <Button
                variant="outline"
                className="h-11 w-full rounded-xl font-semibold sm:w-auto"
                nativeButton={false}
                render={
                  <a href={getMapsSearchUrl(web.address)} target="_blank" rel="noopener noreferrer" />
                }
              >
                <Navigation aria-hidden="true" className="size-4" />
                Cómo llegar
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
