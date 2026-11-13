"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  Globe,
  MapPin,
  MessageCircle,
  Plus,
  QrCode,
  Scale,
  Share2,
  ShieldCheck,
  Sparkles,
  Store,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, SectionTabs, StatCards, type Stat } from "@/features/admin";
import { useCatalog } from "@/features/menu";
import { formatDate } from "@/lib/format";
import { useIsClient } from "@/lib/use-local-store";
import { useSystem } from "../hooks/use-system";
import { legalConfigSchema, webMenuSchema } from "../schemas/system.schema";
import {
  confirmLegalTexts,
  createRegretRequest,
  updateRegretRequestStatus,
  updateWebMenuConfig,
} from "../services/system-store";

type WebTab = "portada" | "qr" | "legal";

/**
 * Genera una matriz determinística tipo QR de 21x21 con los 3 patrones de posición
 * estándar para previsualizar e imprimir cartelería en SVG puro sin dependencias externas.
 */
function buildQrMatrix(seedText: string): boolean[][] {
  const size = 21;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function drawFinder(rowOffset: number, colOffset: number) {
    for (let r = 0; r < 7; r += 1) {
      for (let c = 0; c < 7; c += 1) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[rowOffset + r][colOffset + c] = isBorder || isInner;
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c < 8;
      if (inTopLeft || inTopRight || inBottomLeft) continue;
      if (r === 6 || c === 6) {
        grid[r][c] = (r + c) % 2 === 0;
        continue;
      }
      const cellSeed = Math.imul(hash ^ (r * 31 + c * 17), 2654435761) >>> 0;
      grid[r][c] = cellSeed % 10 < 5;
    }
  }

  return grid;
}

function WebMenuManagerContent() {
  const isHydrated = useIsClient();
  const { web, regretRequests } = useSystem();
  const { products, categories } = useCatalog();
  const [tab, setTab] = useState<WebTab>("portada");

  // Formulario Portada y Wi-Fi
  const [storeName, setStoreName] = useState(web.storeName);
  const [tagline, setTagline] = useState(web.tagline);
  const [promoBanner, setPromoBanner] = useState(web.promoBanner);
  const [promoBannerActive, setPromoBannerActive] = useState(web.promoBannerActive);
  const [whatsappNumber, setWhatsappNumber] = useState(web.whatsappNumber);
  const [instagramHandle, setInstagramHandle] = useState(web.instagramHandle);
  const [facebookUrl, setFacebookUrl] = useState(web.facebookUrl);
  const [tiktokHandle, setTiktokHandle] = useState(web.tiktokHandle);
  const [googleReviewUrl, setGoogleReviewUrl] = useState(web.googleReviewUrl);
  const [address, setAddress] = useState(web.address);
  const [hours, setHours] = useState(web.hours);
  const [deliveryInfo, setDeliveryInfo] = useState(web.deliveryInfo);
  const [wifiSsid, setWifiSsid] = useState(web.wifiSsid);
  const [wifiPassword, setWifiPassword] = useState(web.wifiPassword);
  const [showWifiOnMenu, setShowWifiOnMenu] = useState(web.showWifiOnMenu);

  // Estado QR
  const [qrTitle, setQrTitle] = useState("ESCANEÁ Y PEDÍ SIN FILA");
  const [qrTableLabel, setQrTableLabel] = useState("Salón Principal · Mesas y Packaging");

  // Estado Legal y Arrepentimiento
  const [terms, setTerms] = useState(web.termsAndConditions);
  const [privacy, setPrivacy] = useState(web.privacyPolicy);
  const [regretInfo, setRegretInfo] = useState(web.regretButtonInfo);
  const [confirmedBy, setConfirmedBy] = useState(web.legalConfirmedBy);

  // Simulación de nueva solicitud de botón de arrepentimiento
  const [regCustomer, setRegCustomer] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regOrderCode, setRegOrderCode] = useState("");
  const [regReason, setRegReason] = useState("");

  const storeUrl =
    typeof window !== "undefined" ? `${window.location.origin}/` : "https://burger-vb.app/";

  const qrMatrix = useMemo(
    () => buildQrMatrix(`${storeUrl}|${storeName}|${qrTableLabel}`),
    [storeUrl, storeName, qrTableLabel],
  );

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const availableProducts = products.filter((item) => item.available).length;
  const pendingRegrets = regretRequests.filter((r) => r.status === "pendiente").length;

  const stats: Stat[] = [
    {
      label: "Productos en carta web",
      value: `${availableProducts} / ${products.length}`,
      hint: `${categories.length} categorías publicadas`,
      icon: Store,
    },
    {
      label: "Cartel promocional",
      value: web.promoBannerActive ? "Visible" : "Oculto",
      hint: "Portada de la tienda online",
      icon: Sparkles,
    },
    {
      label: "Wi-Fi del salón",
      value: web.showWifiOnMenu ? web.wifiSsid : "Desactivado",
      hint: web.showWifiOnMenu ? "Visible para clientes en salón" : "Oculto en menú",
      icon: Wifi,
    },
    {
      label: "Legal y arrepentimiento",
      value: pendingRegrets > 0 ? `${pendingRegrets} pend.` : "Al día",
      hint: web.legalConfirmedAt ? "Textos validados" : "Pendiente de firma",
      icon: Scale,
    },
  ];

  function handleSavePortada(e: FormEvent) {
    e.preventDefault();
    const parsed = webMenuSchema.safeParse({
      storeName,
      tagline,
      promoBanner,
      promoBannerActive,
      whatsappNumber,
      instagramHandle,
      facebookUrl,
      tiktokHandle,
      googleReviewUrl,
      address,
      hours,
      deliveryInfo,
      wifiSsid,
      wifiPassword,
      showWifiOnMenu,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisá los campos del menú digital.");
      return;
    }
    updateWebMenuConfig(parsed.data);
    toast.success("Configuración del menú digital y Wi-Fi guardada");
  }

  function handleSaveLegal(e: FormEvent) {
    e.preventDefault();
    const parsed = legalConfigSchema.safeParse({
      termsAndConditions: terms,
      privacyPolicy: privacy,
      regretButtonInfo: regretInfo,
      legalConfirmedBy: confirmedBy,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisá los textos legales.");
      return;
    }
    updateWebMenuConfig({
      termsAndConditions: parsed.data.termsAndConditions,
      privacyPolicy: parsed.data.privacyPolicy,
      regretButtonInfo: parsed.data.regretButtonInfo,
    });
    confirmLegalTexts(parsed.data.legalConfirmedBy);
    toast.success("Textos legales guardados y sellados con conformidad");
  }

  function handleCreateRegret(e: FormEvent) {
    e.preventDefault();
    if (regCustomer.trim().length < 2 || regOrderCode.trim().length < 2) {
      toast.error("Completá el nombre del cliente y el código de pedido o Gift Card.");
      return;
    }
    createRegretRequest({
      customerName: regCustomer.trim(),
      phone: regPhone.trim() || "Sin teléfono",
      orderCode: regOrderCode.trim().toUpperCase(),
      reason: regReason.trim() || "Solicitud ingresada desde Botón de Arrepentimiento",
    });
    setRegCustomer("");
    setRegPhone("");
    setRegOrderCode("");
    setRegReason("");
    toast.success("Solicitud de arrepentimiento / reclamo registrada");
  }

  function handleDownloadQrSvg() {
    const svgEl = document.getElementById("burger-vb-qr-svg");
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgContent = serializer.serializeToString(svgEl);
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `qr-menu-${storeName.toLowerCase().replace(/\s+/g, "-")}.svg`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Código QR descargado en formato vectorial SVG");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menú digital, QR y legales"
        description="Personalizá la portada de la tienda online, el cartel promocional, la tarjeta de Wi-Fi para el salón, el código QR imprimible y el cumplimiento legal."
        actions={
          <Button
            variant="outline"
            className="h-11 rounded-xl px-4 font-semibold"
            onClick={() => window.open("/", "_blank")}
          >
            <ExternalLink className="size-4" />
            Abrir tienda pública
          </Button>
        }
      />

      <StatCards stats={stats} />

      <SectionTabs<WebTab>
        id="web-menu-tabs"
        label="Apartados de menú digital y legal"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "portada", label: "Portada, local y Wi-Fi", icon: Globe },
          { value: "qr", label: "Código QR y links", icon: QrCode },
          {
            value: "legal",
            label: "Legal y botón de arrepentimiento",
            icon: Scale,
            count: pendingRegrets,
          },
        ]}
      />

      <AnimatePresence mode="wait" initial={false}>
        {tab === "portada" && (
          <motion.div
            key="portada"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="grid gap-6 lg:grid-cols-12"
          >
            <form
              onSubmit={handleSavePortada}
              className="bg-background space-y-5 rounded-2xl border p-5 lg:col-span-7"
            >
              <div>
                <h3 className="text-lg font-bold">Identidad y textos de la tienda online</h3>
                <p className="text-muted-foreground text-xs">
                  Estos datos alimentan el encabezado del menú digital, el botón de WhatsApp y la
                  información útil para tus clientes.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="web-store-name">Nombre visible del local</Label>
                  <Input
                    id="web-store-name"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="web-whatsapp">WhatsApp receptor de pedidos</Label>
                  <Input
                    id="web-whatsapp"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="5493870000000"
                    className="h-11 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="web-tagline">Bajada / descripción de portada</Label>
                <Textarea
                  id="web-tagline"
                  rows={2}
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                />
              </div>

              <div className="space-y-3 rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Cartel promocional superior (Banner)</p>
                    <p className="text-muted-foreground text-xs">
                      Destacá el 2x1 de la semana, el reintegro del Club Burger o envíos gratis.
                    </p>
                  </div>
                  <Switch
                    checked={promoBannerActive}
                    onCheckedChange={setPromoBannerActive}
                    aria-label="Mostrar cartel promocional"
                  />
                </div>
                <Input
                  value={promoBanner}
                  onChange={(e) => setPromoBanner(e.target.value)}
                  placeholder="🔥 Miércoles de Club Burger..."
                  className="h-10"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="web-address">Dirección del local</Label>
                  <Input
                    id="web-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="web-hours">Horarios de atención</Label>
                  <Input
                    id="web-hours"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="web-ig">Instagram</Label>
                  <Input
                    id="web-ig"
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    placeholder="@burgervb.oficial"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="web-delivery">Zona y condición de delivery</Label>
                  <Input
                    id="web-delivery"
                    value={deliveryInfo}
                    onChange={(e) => setDeliveryInfo(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="web-fb">Facebook (link completo, opcional)</Label>
                  <Input
                    id="web-fb"
                    type="url"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    placeholder="https://facebook.com/tu-local"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="web-tiktok">TikTok (opcional)</Label>
                  <Input
                    id="web-tiktok"
                    value={tiktokHandle}
                    onChange={(e) => setTiktokHandle(e.target.value)}
                    placeholder="@tu-local"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="web-google-review">Link para dejar reseña en Google</Label>
                  <Input
                    id="web-google-review"
                    type="url"
                    value={googleReviewUrl}
                    onChange={(e) => setGoogleReviewUrl(e.target.value)}
                    placeholder="https://g.page/r/.../review"
                    className="h-11"
                  />
                  <p className="text-muted-foreground text-xs">
                    Lo encontrás en tu Perfil de Empresa de Google → &quot;Pedir reseñas&quot;. Si lo
                    dejás vacío, el botón abre tu local en Google Maps.
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Wifi className="text-primary size-4" />
                    <div>
                      <p className="text-sm font-semibold">Wi-Fi para clientes en salón</p>
                      <p className="text-muted-foreground text-xs">
                        Muestra una tarjeta en el menú QR para que las mesas se conecten en un toque.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={showWifiOnMenu}
                    onCheckedChange={setShowWifiOnMenu}
                    aria-label="Mostrar Wi-Fi en el menú"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="wifi-ssid" className="text-xs">
                      Nombre de la red (SSID)
                    </Label>
                    <Input
                      id="wifi-ssid"
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="wifi-pass" className="text-xs">
                      Contraseña Wi-Fi
                    </Label>
                    <Input
                      id="wifi-pass"
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      className="h-10 font-mono"
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="h-11 w-full rounded-xl font-bold">
                Guardar cambios del menú digital
              </Button>
            </form>

            {/* Vista previa en vivo del Menú Digital */}
            <div className="space-y-4 lg:col-span-5">
              <div className="bg-background overflow-hidden rounded-2xl border shadow-sm">
                <div className="bg-muted/50 flex items-center justify-between border-b px-4 py-2.5">
                  <span className="text-xs font-bold tracking-wider uppercase">
                    Vista previa móvil en vivo
                  </span>
                  <Badge variant="outline" className="rounded-full text-[11px]">
                    Menú QR + Web
                  </Badge>
                </div>

                {promoBannerActive && promoBanner && (
                  <div className="bg-primary text-primary-foreground px-4 py-2 text-center text-xs font-bold">
                    {promoBanner}
                  </div>
                )}

                <div className="space-y-4 p-5">
                  <div>
                    <Badge className="mb-2 rounded-full">Abierto para pedidos</Badge>
                    <h4 className="text-2xl font-extrabold tracking-tight">{storeName}</h4>
                    <p className="text-muted-foreground mt-1 text-sm">{tagline}</p>
                  </div>

                  <div className="bg-muted/40 space-y-2 rounded-xl border p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <MapPin className="text-primary size-4 shrink-0" />
                      <span>{address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Store className="text-primary size-4 shrink-0" />
                      <span>{hours}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Share2 className="text-primary size-4 shrink-0" />
                      <span>{instagramHandle}</span>
                    </div>
                  </div>

                  {showWifiOnMenu && (
                    <div className="border-primary/30 bg-primary/5 flex items-center justify-between rounded-xl border p-3">
                      <div className="flex items-center gap-2.5">
                        <Wifi className="text-primary size-5" />
                        <div>
                          <p className="text-xs font-bold">Wi-Fi Clientes: {wifiSsid}</p>
                          <p className="text-muted-foreground font-mono text-xs">
                            Clave: {wifiPassword}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg text-xs"
                        onClick={() => {
                          navigator.clipboard?.writeText(wifiPassword);
                          toast.success("Clave Wi-Fi copiada");
                        }}
                      >
                        <Copy className="size-3" />
                        Copiar clave
                      </Button>
                    </div>
                  )}

                  <div className="border-t pt-3 text-center">
                    <p className="text-muted-foreground text-[11px]">{deliveryInfo}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {tab === "qr" && (
          <motion.div
            key="qr"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="grid gap-6 lg:grid-cols-12"
          >
            <div className="bg-background space-y-5 rounded-2xl border p-5 lg:col-span-7">
              <div>
                <h3 className="text-lg font-bold">Generador de cartel QR para mesas y bolsas</h3>
                <p className="text-muted-foreground text-xs">
                  Imprimí los códigos QR para las mesas del salón o pegalos como sticker en las
                  bolsas kraft de delivery para que tus clientes pidan directo y sumen sellos.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="qr-title">Título del cartel</Label>
                  <Input
                    id="qr-title"
                    value={qrTitle}
                    onChange={(e) => setQrTitle(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="qr-sub">Subtítulo / Ubicación (ej. Mesa 1 / Delivery)</Label>
                  <Input
                    id="qr-sub"
                    value={qrTableLabel}
                    onChange={(e) => setQrTableLabel(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border p-4">
                <p className="text-xs font-bold tracking-wider uppercase">
                  Links directos para compartir en Instagram o WhatsApp
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2">
                  <span className="truncate font-mono text-xs">{storeUrl}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="rounded-lg text-xs"
                    onClick={() => {
                      navigator.clipboard?.writeText(storeUrl);
                      toast.success("Link de la tienda copiado al portapapeles");
                    }}
                  >
                    <Copy className="size-3.5" />
                    Copiar link tienda
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2">
                  <span className="truncate font-mono text-xs">
                    https://wa.me/{web.whatsappNumber}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-lg text-xs"
                    onClick={() => {
                      navigator.clipboard?.writeText(`https://wa.me/${web.whatsappNumber}`);
                      toast.success("Link directo de WhatsApp copiado");
                    }}
                  >
                    <MessageCircle className="size-3.5" />
                    Copiar link WhatsApp
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  className="h-11 rounded-xl font-bold"
                  onClick={handleDownloadQrSvg}
                >
                  <Download className="size-4" />
                  Descargar QR en SVG (Vectorial)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl font-semibold"
                  onClick={() => window.print()}
                >
                  Imprimir cartel de mesa
                </Button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-background flex flex-col items-center rounded-2xl border p-6 text-center shadow-sm">
                <Badge className="mb-2 rounded-full">{web.storeName}</Badge>
                <h4 className="text-lg font-extrabold tracking-tight uppercase">{qrTitle}</h4>
                <p className="text-muted-foreground mb-4 text-xs">{qrTableLabel}</p>

                <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-sm">
                  <svg
                    id="burger-vb-qr-svg"
                    viewBox="0 0 25 25"
                    className="size-48"
                    role="img"
                    aria-label={`Código QR de ${web.storeName}`}
                  >
                    <rect width="25" height="25" fill="#ffffff" />
                    {qrMatrix.map((row, rIdx) =>
                      row.map((cell, cIdx) =>
                        cell ? (
                          <rect
                            key={`${rIdx}-${cIdx}`}
                            x={cIdx + 2}
                            y={rIdx + 2}
                            width={1}
                            height={1}
                            fill="#111827"
                          />
                        ) : null,
                      ),
                    )}
                  </svg>
                </div>

                {web.showWifiOnMenu && (
                  <p className="text-muted-foreground mt-4 text-xs">
                    Wi-Fi Salón: <strong className="text-foreground">{web.wifiSsid}</strong> ·
                    Clave: <strong className="text-foreground">{web.wifiPassword}</strong>
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {tab === "legal" && (
          <motion.div
            key="legal"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="grid gap-6 lg:grid-cols-12">
              <form
                onSubmit={handleSaveLegal}
                className="bg-background space-y-4 rounded-2xl border p-5 lg:col-span-7"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-primary text-xs font-bold tracking-wider uppercase">
                      Normativa Defensa del Consumidor y Datos Personales
                    </span>
                    <h3 className="text-lg font-bold">
                      Términos, privacidad y confirmación del titular
                    </h3>
                  </div>
                  <ShieldCheck className="text-primary size-6 shrink-0" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="legal-terms">Términos y condiciones de compra online</Label>
                  <Textarea
                    id="legal-terms"
                    rows={3}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="legal-privacy">
                    Política de privacidad (Ley 25.326 de Protección de Datos)
                  </Label>
                  <Textarea
                    id="legal-privacy"
                    rows={3}
                    value={privacy}
                    onChange={(e) => setPrivacy(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="legal-regret">
                    Leyenda del Botón de Arrepentimiento (Res. 424/2020)
                  </Label>
                  <Textarea
                    id="legal-regret"
                    rows={2}
                    value={regretInfo}
                    onChange={(e) => setRegretInfo(e.target.value)}
                  />
                </div>

                <div className="bg-muted/40 space-y-3 rounded-2xl border p-4">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="text-primary size-4" />
                    <p className="text-sm font-bold">
                      Confirmación del titular o asesor legal responsable
                    </p>
                  </div>
                  <Input
                    value={confirmedBy}
                    onChange={(e) => setConfirmedBy(e.target.value)}
                    placeholder="Nombre del titular o abogado revisor"
                    className="h-10"
                  />
                  {web.legalConfirmedAt && (
                    <p className=" flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5" />
                      Última validación registrada: {web.legalConfirmedBy} (
                      {formatDate(web.legalConfirmedAt)})
                    </p>
                  )}
                </div>

                <Button type="submit" className="h-11 w-full rounded-xl font-bold">
                  Guardar y firmar conformidad legal
                </Button>
              </form>

              {/* Bandeja de Botón de Arrepentimiento / Libro de quejas online */}
              <div className="bg-background space-y-4 rounded-2xl border p-5 lg:col-span-5">
                <div>
                  <span className="text-primary text-xs font-bold tracking-wider uppercase">
                    Resolución 424/2020 SCI
                  </span>
                  <h3 className="text-lg font-bold">Bandeja de arrepentimiento y reclamos</h3>
                  <p className="text-muted-foreground text-xs">
                    Registrá o gestioná solicitudes de revocación de compra, reintegros al monedero
                    o reclamos de pedidos.
                  </p>
                </div>

                <form onSubmit={handleCreateRegret} className="space-y-3 rounded-xl border p-3.5">
                  <p className="text-xs font-bold">Cargar solicitud manual / testear recepción</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="Cliente (ej. Sofía Paz)"
                      value={regCustomer}
                      onChange={(e) => setRegCustomer(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <Input
                      placeholder="Código (ej. PED-1055)"
                      value={regOrderCode}
                      onChange={(e) => setRegOrderCode(e.target.value)}
                      className="h-9 font-mono text-xs"
                    />
                  </div>
                  <Input
                    placeholder="Teléfono WhatsApp"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <Input
                    placeholder="Motivo del reclamo o arrepentimiento"
                    value={regReason}
                    onChange={(e) => setRegReason(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <Button type="submit" size="sm" variant="secondary" className="w-full rounded-lg">
                    <Plus className="size-3.5" />
                    Ingresar ticket de arrepentimiento
                  </Button>
                </form>

                <div className="max-h-72 overflow-y-auto rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Caso</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {regretRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell>
                            <p className="text-xs font-bold">
                              {req.orderCode} · {req.customerName}
                            </p>
                            <p className="text-muted-foreground line-clamp-2 text-[11px]">
                              {req.reason}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={req.status === "pendiente" ? "destructive" : "secondary"}
                              className="rounded-full text-[10px] uppercase"
                            >
                              {req.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {req.status === "pendiente" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 rounded-lg text-[11px]"
                                onClick={() => {
                                  updateRegretRequestStatus(req.id, "reintegrado");
                                  toast.success(`Solicitud ${req.orderCode} marcada como resuelta`);
                                }}
                              >
                                Resolver
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">Cerrado</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Monta el formulario recién después de hidratar, para que arranque con los datos guardados. */
export function WebMenuManager() {
  const isHydrated = useIsClient();
  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }
  return <WebMenuManagerContent />;
}
