"use client";

import Link from "next/link";
import { Clock, MapPin, MessageCircle } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { businessConfig } from "@/config/business.config";
import { useSystem } from "@/features/system";
import { PAGE_CONTAINER } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { useSocialLinks } from "./social-section";

const LEGAL_LINKS = [
  { href: businessConfig.webAndLegal.legalRoutes.terminos, label: "Términos y condiciones" },
  { href: businessConfig.webAndLegal.legalRoutes.privacidad, label: "Política de privacidad" },
  { href: businessConfig.webAndLegal.legalRoutes.arrepentimiento, label: "Botón de arrepentimiento" },
];

const linkClass =
  "text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex min-h-10 items-center gap-2 rounded-lg text-sm outline-none underline-offset-4 hover:underline focus-visible:ring-3";

export function StoreFooter() {
  const { web } = useSystem();
  const socials = useSocialLinks().filter((s) => s.id !== "whatsapp");
  const { developer } = businessConfig.site;

  return (
    <footer className="bg-muted/40 border-t pb-24 md:pb-0">
      <div className={cn(PAGE_CONTAINER, "grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4")}>
        <div className="space-y-4">
          <Logo />
          <p className="text-muted-foreground max-w-xs text-sm text-pretty">{web.tagline}</p>
          {socials.length > 0 && (
            <ul className="flex gap-2" aria-label="Redes sociales">
              {socials.map(({ id, name, href, icon: Icon }) => (
                <li key={id}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={name}
                    className="bg-background hover:bg-primary hover:text-primary-foreground focus-visible:ring-ring/50 grid size-11 place-items-center rounded-xl border outline-none transition-colors focus-visible:ring-3"
                  >
                    <Icon className="size-5" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Horarios</h2>
          <p className="text-muted-foreground flex items-start gap-2 text-sm">
            <Clock aria-hidden="true" className="text-brand mt-0.5 size-4 shrink-0" />
            <span className="break-words">{web.hours}</span>
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Contacto</h2>
          <ul className="space-y-1 text-sm">
            <li className="text-muted-foreground flex items-start gap-2">
              <MapPin aria-hidden="true" className="text-brand mt-0.5 size-4 shrink-0" />
              <span className="break-words">{web.address}</span>
            </li>
            <li>
              <a
                href={getWhatsAppUrl(web.whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(linkClass, "text-foreground font-medium")}
              >
                <MessageCircle aria-hidden="true" className="text-brand size-4" />
                Escribinos por WhatsApp
              </a>
            </li>
          </ul>
        </div>

        <nav aria-label="Información legal" className="space-y-3">
          <h2 className="text-sm font-semibold">Legal</h2>
          <ul>
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t">
        <div
          className={cn(
            PAGE_CONTAINER,
            "text-muted-foreground flex flex-col gap-2 py-5 text-xs sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <p>
            © {web.storeName}. Todos los derechos reservados.{" "}
            <Link href={LEGAL_LINKS[0].href} className="hover:text-foreground underline-offset-4 hover:underline">
              Términos
            </Link>{" "}
            ·{" "}
            <Link href={LEGAL_LINKS[1].href} className="hover:text-foreground underline-offset-4 hover:underline">
              Políticas
            </Link>
          </p>
          <p>
            Hecho por <span className="text-foreground font-semibold">{developer.name}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
