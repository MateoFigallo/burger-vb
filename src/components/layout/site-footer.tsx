import { Clock, MapPin, MessageCircle } from "lucide-react";
import { siteConfig } from "@/config/site";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="bg-muted/40 border-t pb-24 md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div className="space-y-3">
          <Logo />
          <p className="text-muted-foreground max-w-xs text-sm">{siteConfig.description}</p>
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Horarios</h2>
          <p className="text-muted-foreground flex items-start gap-2 text-sm">
            <Clock aria-hidden="true" className="text-brand mt-0.5 size-4 shrink-0" />
            {siteConfig.hours}
          </p>
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Contacto</h2>
          <ul className="text-muted-foreground space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <MapPin aria-hidden="true" className="text-brand mt-0.5 size-4 shrink-0" />
              {siteConfig.address}
            </li>
            <li>
              <a
                href={getWhatsAppUrl(siteConfig.whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground focus-visible:ring-ring/50 inline-flex min-h-11 items-center gap-2 rounded-lg font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3"
              >
                <MessageCircle aria-hidden="true" className="text-brand size-4" />
                Escribinos por WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <p className="text-muted-foreground mx-auto max-w-6xl px-4 py-5 text-xs sm:px-6">
          © {siteConfig.name}. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
