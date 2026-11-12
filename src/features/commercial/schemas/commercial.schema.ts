import { z } from "zod";

export const openCashSessionSchema = z.object({
  registerId: z.string().min(1, "Seleccioná una caja."),
  openingAmount: z.number().min(0, "El fondo inicial no puede ser negativo.").max(50_000_000),
});

export type OpenCashSessionFormValues = z.infer<typeof openCashSessionSchema>;

export const cashMovementSchema = z.object({
  kind: z.enum(["ingreso", "egreso"]),
  rubroId: z.string().min(1, "Elegí un rubro."),
  amount: z.number().positive("El importe debe ser mayor a cero.").max(50_000_000),
  concept: z.string().trim().min(3, "Escribí un detalle de al menos 3 letras.").max(120),
});

export type CashMovementFormValues = z.infer<typeof cashMovementSchema>;

export const closeCashSessionSchema = z.object({
  countedCash: z.number().min(0, "El efectivo contado no puede ser negativo."),
  notes: z.string().max(240),
});

export type CloseCashSessionFormValues = z.infer<typeof closeCashSessionSchema>;

export const fundTransferSchema = z.object({
  fromRegisterId: z.string().min(1, "Elegí la caja de origen."),
  toRegisterId: z.string().min(1, "Elegí la caja de destino."),
  amount: z.number().positive("El monto a transferir debe ser mayor a cero."),
  concept: z.string().trim().min(3, "Indicá el concepto del traspaso.").max(120),
});

export type FundTransferFormValues = z.infer<typeof fundTransferSchema>;
