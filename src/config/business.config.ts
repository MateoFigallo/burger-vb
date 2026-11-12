export type SiteConfig = {
  name: string;
  description: string;
  /** Número que recibe los pedidos. Se configura en NEXT_PUBLIC_WHATSAPP_NUMBER. */
  whatsappNumber: string;
  address: string;
  hours: string;
  developer: {
    name: string;
    motto: string;
    phone: string;
    email: string;
  };
};

/** Módulos del panel. Cada empleado puede tener acceso a algunos de ellos. */
export type ModuleId =
  | "vender"
  | "resumen"
  | "pedidos"
  | "caja"
  | "productos"
  | "web"
  | "inventario"
  | "mermas"
  | "presupuestos"
  | "proveedores"
  | "clientes"
  | "sellos"
  | "monedero"
  | "campanas"
  | "equipo"
  | "sistema";

export type LogisticsSectionId = "inventario" | "mermas" | "presupuestos" | "proveedores";

export type PanelModule = {
  id: ModuleId;
  label: string;
  shortLabel?: string;
  description: string;
  href: string;
  shortcut?: string;
  featured?: boolean;
};

export type PanelGroup = {
  label: string;
  modules: ModuleId[];
};

export const businessConfig = {
  site: {
    name: "Burger VB",
    description:
      "Hamburguesas artesanales hechas a la parrilla. Armá tu pedido online y confirmalo por WhatsApp.",
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5491100000000",
    address: "Av. Principal 1234, Ciudad",
    hours: "Martes a domingo, de 19:00 a 00:00",
    developer: {
      name: "VINCULAR BUSINESS",
      motto: "Tu idea, en buenas manos.",
      phone: "(387) 4484132",
      email: "vincularbusiness@gmail.com",
    },
  } satisfies SiteConfig,

  panel: {
    modules: {
      vender: {
        id: "vender",
        label: "Vender POS",
        shortLabel: "Vender",
        description:
          "Punto de venta rápido con atajos F1–F12, combos, pago mixto, cuenta corriente y descuento de stock.",
        href: "/dashboard/vender",
        shortcut: "F1",
        featured: true,
      },
      resumen: {
        id: "resumen",
        label: "Resumen y análisis",
        shortLabel: "Resumen",
        description:
          "Tablero ejecutivo dividido por análisis de ventas, stock y costos, caja y fidelidad de clientes.",
        href: "/dashboard/resumen",
      },
      pedidos: {
        id: "pedidos",
        label: "Pedidos y comandas",
        shortLabel: "Pedidos",
        description: "Ver comandas web/WhatsApp, cambiar su estado y abrir o cerrar el local.",
        href: "/dashboard",
      },
      caja: {
        id: "caja",
        label: "Gestión de caja",
        shortLabel: "Caja",
        description:
          "Apertura de turno, ingresos y egresos, Corte X, arqueo de un solo dueño y cierres Z sellados con SHA-256.",
        href: "/dashboard/caja",
      },
      productos: {
        id: "productos",
        label: "Carta y productos",
        shortLabel: "Carta",
        description: "Crear hamburguesas, combos y categorías, precios, descuentos y promos.",
        href: "/dashboard/productos",
      },
      web: {
        id: "web",
        label: "Menú digital y legal",
        shortLabel: "Menú y web",
        description:
          "Personalizar la tienda online, cartel promocional, Wi-Fi del salón, QR imprimible y legales / arrepentimiento.",
        href: "/dashboard/web",
      },
      inventario: {
        id: "inventario",
        label: "Stock e inventario",
        shortLabel: "Stock",
        description:
          "Control de stock, costos, márgenes, códigos de barras, combos y ajustes por categoría.",
        href: "/dashboard/inventario",
      },
      mermas: {
        id: "mermas",
        label: "Mermas y devoluciones",
        shortLabel: "Mermas",
        description:
          "Roturas, vencimientos, consumo interno y devoluciones parciales valorizadas al costo.",
        href: "/dashboard/mermas",
      },
      presupuestos: {
        id: "presupuestos",
        label: "Presupuestos",
        shortLabel: "Presupuestos",
        description:
          "Cotizaciones para eventos o pedidos grandes que no mueven stock hasta confirmarse.",
        href: "/dashboard/presupuestos",
      },
      proveedores: {
        id: "proveedores",
        label: "Proveedores",
        shortLabel: "Proveedores",
        description:
          "Proveedores, órdenes de compra, recepción de remitos/facturas y cuenta corriente.",
        href: "/dashboard/proveedores",
      },
      clientes: {
        id: "clientes",
        label: "Clientes y fiado",
        shortLabel: "Clientes",
        description:
          "Fichas de clientes, cuenta corriente / fiado, historial de compras y acceso a la app.",
        href: "/dashboard/clientes",
      },
      sellos: {
        id: "sellos",
        label: "Club, sellos y niveles",
        shortLabel: "Club y sellos",
        description:
          "Tarjeta de sellos, niveles Bronce/Plata/Oro por consumo, regalo de cumpleaños y premios.",
        href: "/dashboard/sellos",
      },
      monedero: {
        id: "monedero",
        label: "Monedero y cupones",
        shortLabel: "Monedero",
        description:
          "Saldo en monedero digital, cashback, emisión de Gift Cards y cupones de descuento.",
        href: "/dashboard/monedero",
      },
      campanas: {
        id: "campanas",
        label: "Campañas WhatsApp",
        shortLabel: "Campañas",
        description: "Armar y enviar campañas segmentadas a grupos de clientes.",
        href: "/dashboard/campanas",
      },
      equipo: {
        id: "equipo",
        label: "Equipo, RRHH y tareas",
        shortLabel: "Equipo",
        description:
          "Empleados, roles por módulo, fichaje con PIN, adelantos de sueldo y checklist de tareas operativas.",
        href: "/dashboard/equipo",
      },
      sistema: {
        id: "sistema",
        label: "Sistema y auditoría",
        shortLabel: "Sistema",
        description:
          "Configuración comercial y fiscal ARCA, bitácora de auditoría inmutable y copias de seguridad.",
        href: "/dashboard/sistema",
      },
    } satisfies Record<ModuleId, PanelModule>,

    groups: [
      { label: "Resumen", modules: ["resumen"] },
      { label: "Operación comercial", modules: ["pedidos", "caja"] },
      {
        label: "Logística e inventario",
        modules: ["inventario", "mermas", "presupuestos", "proveedores"],
      },
      {
        label: "Clientes y fidelidad",
        modules: ["clientes", "sellos", "monedero", "campanas"],
      },
      { label: "Equipo", modules: ["equipo"] },
      { label: "Menú y web", modules: ["productos", "web"] },
      { label: "Sistema", modules: ["sistema"] },
    ] satisfies PanelGroup[],
  },

  commercial: {
    posPaymentMethods: {
      efectivo: "Efectivo",
      debito: "Tarjeta de débito",
      credito: "Tarjeta de crédito",
      transferencia: "Transferencia",
      mercadopago: "Mercado Pago / QR",
      monedero: "Monedero Club",
      giftcard: "Gift Card",
      fiado: "Cuenta corriente / Fiado",
    } as const,
    functionKeys: [
      { key: "F1", action: "efectivo", label: "Efectivo" },
      { key: "F2", action: "debito", label: "Débito" },
      { key: "F3", action: "credito", label: "Crédito" },
      { key: "F4", action: "fiado", label: "Cta. Cte." },
      { key: "F5", action: "mercadopago", label: "QR / MP" },
      { key: "F6", action: "monedero", label: "Monedero" },
      { key: "F7", action: "clear", label: "Limpiar" },
      { key: "F8", action: "arca", label: "Ticket ARCA" },
      { key: "F9", action: "FocusSearch", label: "Buscar" },
      { key: "F10", action: "coupon", label: "Cupón" },
      { key: "F12", action: "checkout", label: "Cobrar" },
    ] as const,
    cashRubros: {
      ingreso: [
        { id: "cambio_inicial", label: "Refuerzo de cambio" },
        { id: "cobro_fiado", label: "Cobro de cuenta corriente / fiado" },
        { id: "carga_monedero", label: "Carga de monedero / Gift Card" },
        { id: "ajuste_positivo", label: "Ajuste de caja (+)" },
      ] as const,
      egreso: [
        { id: "pago_proveedor", label: "Pago a proveedor en efectivo" },
        { id: "insumos_cocina", label: "Compra urgente de insumos (pan/hielo/verdura)" },
        { id: "cadeteria", label: "Pago a repartidores / cadetería" },
        { id: "retiro_dueno", label: "Retiro del dueño / alivio de caja" },
        { id: "gastos_varios", label: "Gastos operativos del local" },
      ] as const,
    },
    defaultRegisters: [
      {
        id: "caja-mostrador-1",
        name: "Caja 1 · Mostrador Principal",
        branch: "Sucursal Centro",
        active: true,
      },
      {
        id: "caja-delivery-2",
        name: "Caja 2 · Expedición Delivery",
        branch: "Sucursal Centro",
        active: true,
      },
    ] as const,
    defaultFiadoDays: 15,
    defaultCreditLimit: 80000,
  },

  loyaltyClub: {
    defaultTiers: [
      { key: "bronce", name: "Bronce", minSpend: 0, discountPct: 0, badge: "🥉" },
      { key: "plata", name: "Plata", minSpend: 60000, discountPct: 5, badge: "🥈" },
      { key: "oro", name: "Oro", minSpend: 150000, discountPct: 10, badge: "🥇" },
    ] as const,
    defaultPeriodDays: 90,
    defaultBirthdayDiscountPct: 15,
    defaultCashbackPct: 10,
    defaultCashbackDays: [3] as const, // Miércoles de Club Burger
    defaultGiftCardMonths: 6,
  },

  logistics: {
    lowStockThreshold: 5,
    quoteMinDays: 1,
    quoteMaxDays: 90,
    quoteDefaultDays: 7,
    allowNegativeStockByDefault: true,
    categoryColors: [
      "#e11d48",
      "#d97706",
      "#2563eb",
      "#16a34a",
      "#9333ea",
      "#0d9488",
      "#ea580c",
      "#4f46e5",
    ] as const,
    units: {
      u: { label: "Unidad (und)", short: "und" },
      kg: { label: "Kilogramo (kg)", short: "kg" },
      l: { label: "Litro (lt)", short: "lt" },
    } as const,
    movementTypes: {
      ajuste: "Ajuste / recuento",
      merma: "Merma",
      rotura: "Rotura",
      vencimiento: "Vencimiento",
      robo: "Robo / faltante",
      consumo: "Consumo interno",
    } as const,
    refundMethods: {
      efectivo: "Efectivo (caja)",
      monedero: "Monedero del cliente",
      otro: "Mismo medio digital (transferencia / tarjeta)",
    } as const,
    ivaConditions: ["Responsable Inscripto", "Monotributista", "Exento"] as const,
    supplierPaymentMethods: {
      efectivo: "Efectivo",
      transferencia: "Transferencia",
      cheque: "Cheque",
      tarjeta: "Tarjeta",
    } as const,
    receiptTypes: ["Factura", "Remito"] as const,
    purchaseOrderStatuses: ["Borrador", "Solicitada", "Recibida", "Cancelada"] as const,
    quoteStatuses: {
      vigente: "Vigente",
      vencido: "Vencido",
      convertido: "Convertido en pedido",
      anulado: "Anulado",
    } as const,
    periods: [
      { days: 7, label: "7 días" },
      { days: 30, label: "30 días" },
      { days: 90, label: "90 días" },
      { days: 365, label: "1 año" },
    ] as const,
  },

  teamOps: {
    shifts: [
      { id: "mediodia", label: "Turno Mediodía (11:30 a 16:00)" },
      { id: "noche", label: "Turno Noche (18:30 a 00:30)" },
      { id: "franquero", label: "Franquero Fin de Semana" },
    ] as const,
    taskFrequencies: {
      diaria: "Diaria (cada turno)",
      semanal: "Semanal",
      apertura: "Apertura de local",
      cierre: "Cierre de cocina y salón",
    } as const,
    defaultTasks: [
      {
        title: "Encendido, desengrasado y curado de plancha smash a 220°C",
        roleName: "Cocina",
        frequency: "apertura" as const,
      },
      {
        title: "Control de temperatura de cámaras de frío (medallones 2°C / lácteos 4°C)",
        roleName: "Cocina",
        frequency: "diaria" as const,
      },
      {
        title: "Armado de mise en place: fetas de cheddar, bacon crocante y cebolla picada",
        roleName: "Cocina",
        frequency: "apertura" as const,
      },
      {
        title: "Filtrado de aceite de freidoras y reposición de papas bastón",
        roleName: "Cocina",
        frequency: "cierre" as const,
      },
      {
        title: "Conteo de fondo de cambio y verificación de rollos térmicos 80mm",
        roleName: "Cajero",
        frequency: "apertura" as const,
      },
      {
        title: "Control de packaging de delivery (cajas térmicas, bolsas kraft y stickers)",
        roleName: "Encargado",
        frequency: "semanal" as const,
      },
    ] as const,
  },

  webAndLegal: {
    defaultPromoBanner:
      "🔥 MIÉRCOLES DE CLUB BURGER: 10% de reintegro en tu monedero + 2x1 en Papas Cheddar pidiendo desde la web.",
    defaultInstagram: "@burgervb.oficial",
    defaultWifiSsid: "BurgerVB_Clientes_5G",
    defaultWifiPass: "smashburger2026",
    defaultDeliveryZones: "Radio de 4 km sin cargo en pedidos superiores a $25.000",
    defaultTerms:
      "Los pedidos realizados por el menú digital de Burger VB se confirman vía WhatsApp o recepción en mostrador. Los precios publicados incluyen IVA. Las promociones del Club Burger y cupones de descuento aplican según vigencia informada en cada campaña.",
    defaultPrivacyPolicy:
      "Conforme a la Ley 25.326 de Protección de Datos Personales, los datos de contacto (nombre, teléfono y dirección de entrega) recolectados en Burger VB se utilizan exclusivamente para gestionar pedidos, administrar el programa de fidelidad (sellos y monedero) y enviar novedades autorizadas por el cliente.",
    defaultRegretInfo:
      "De acuerdo con la Resolución 424/2020 de la Secretaría de Comercio Interior, podés solicitar la revocación o reclamo de tu compra o recarga de Gift Card/Monedero indicando tu número de pedido o teléfono.",
  },

  system: {
    defaultCuit: "30-71654321-9",
    defaultPtoVtaArca: "0004",
    defaultIvaCondition: "Responsable Inscripto",
    defaultTicketFooter: "¡Gracias por elegir Burger VB! Escaneá el QR de tu bolsa para sumar sellos.",
    auditCategories: {
      CAJA_CIERRE_Z: "Cierre Z y Arqueo",
      VENTA_POS: "Ventas POS y Anulaciones",
      STOCK_AJUSTE: "Ajustes de Stock y Mermas",
      CLUB_MONEDERO: "Fidelidad y Monedero",
      RRHH_FICHAJE: "Equipo, RRHH y Roles",
      SISTEMA_CONFIG: "Configuración y Backups",
    } as const,
  },
} as const;
