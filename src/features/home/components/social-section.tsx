"use client";

import type { ComponentType, SVGProps } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { FacebookIcon, InstagramIcon, TiktokIcon } from "@/components/icons/social-icons";
import { getInstagramUrl, getTiktokUrl, useSystem } from "@/features/system";
import { PAGE_CONTAINER } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/whatsapp";

type SocialLink = {
  id: string;
  name: string;
  handle: string;
  href: string;
  cta: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  className: string;
};

/** Redes del local, tomadas de Panel → Menú digital y legal. */
export function useSocialLinks(): SocialLink[] {
  const { web } = useSystem();
  const links: SocialLink[] = [];

  const instagram = getInstagramUrl(web.instagramHandle);
  if (instagram) {
    links.push({
      id: "instagram",
      name: "Instagram",
      handle: web.instagramHandle.startsWith("@") ? web.instagramHandle : `@${web.instagramHandle}`,
      href: instagram,
      cta: "Seguinos",
      icon: InstagramIcon,
      className: "bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400 text-white",
    });
  }
  const tiktok = getTiktokUrl(web.tiktokHandle);
  if (tiktok) {
    links.push({
      id: "tiktok",
      name: "TikTok",
      handle: web.tiktokHandle.startsWith("@") ? web.tiktokHandle : `@${web.tiktokHandle}`,
      href: tiktok,
      cta: "Mirá los videos",
      icon: TiktokIcon,
      className: "bg-zinc-900 text-white dark:bg-zinc-800",
    });
  }
  if (web.facebookUrl.trim()) {
    links.push({
      id: "facebook",
      name: "Facebook",
      handle: web.storeName,
      href: web.facebookUrl.trim(),
      cta: "Dale me gusta",
      icon: FacebookIcon,
      className: "bg-[#1877F2] text-white",
    });
  }
  if (web.whatsappNumber.trim()) {
    links.push({
      id: "whatsapp",
      name: "WhatsApp",
      handle: "Pedidos y consultas",
      href: getWhatsAppUrl(web.whatsappNumber),
      cta: "Escribinos",
      icon: MessageCircle,
      className: "bg-whatsapp text-whatsapp-foreground",
    });
  }
  return links;
}

export function SocialSection() {
  const links = useSocialLinks();
  if (links.length === 0) return null;

  return (
    <section id="redes" aria-labelledby="redes-title" className="pb-16 md:pb-24">
      <div className={PAGE_CONTAINER}>
        <div className="bg-card rounded-3xl border p-5 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-brand text-sm font-semibold tracking-widest uppercase">Redes</p>
              <h2 id="redes-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Seguinos y enterate de las promos primero
              </h2>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {links.map(({ id, name, handle, href, cta, icon: Icon, className }, index) => (
              <motion.li
                key={id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.2, ease: "easeOut", delay: index * 0.04 }}
              >
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "group focus-visible:ring-ring/50 flex min-h-24 items-center gap-4 rounded-2xl p-4 shadow-sm outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-3",
                    className,
                  )}
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
                    <Icon className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{name}</span>
                    <span className="block truncate text-sm opacity-90">{handle}</span>
                    <span className="mt-0.5 block text-xs font-semibold opacity-80">{cta}</span>
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-5 shrink-0 opacity-70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </a>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
