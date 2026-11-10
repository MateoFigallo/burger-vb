import { daysSince, isBirthdayThisMonth } from "@/lib/dates";
import type { Customer, CustomerSegment, SegmentOptions } from "../types";

export const SEGMENT_LABELS: Record<CustomerSegment, string> = {
  todos: "Todos los clientes",
  cumpleanos: "Cumplen años este mes",
  inactivos: "Inactivos",
  canje: "Pueden canjear un premio",
  nuevos: "Nuevos (últimos 30 días)",
};

export const SEGMENTS = Object.keys(SEGMENT_LABELS) as CustomerSegment[];

export const INACTIVE_DAY_OPTIONS = [30, 60, 90] as const;

export const DEFAULT_INACTIVE_DAYS = 60;

export function isCustomerSegment(value: unknown): value is CustomerSegment {
  return typeof value === "string" && value in SEGMENT_LABELS;
}

/** Un cliente está inactivo si no pide hace más de `inactiveDays` días. */
export function isInactive(
  customer: Customer,
  options: Pick<SegmentOptions, "now" | "inactiveDays">,
) {
  const reference = customer.lastOrderAt ?? customer.createdAt;
  return daysSince(reference, options.now) > options.inactiveDays;
}

export function matchesSegment(
  customer: Customer,
  segment: CustomerSegment,
  options: SegmentOptions,
): boolean {
  switch (segment) {
    case "todos":
      return true;
    case "cumpleanos":
      return isBirthdayThisMonth(customer.birthday, options.now);
    case "inactivos":
      return isInactive(customer, options);
    case "canje":
      return customer.stamps >= options.stampsRequired;
    case "nuevos":
      return daysSince(customer.createdAt, options.now) <= 30;
  }
}

export function filterBySegment(
  customers: Customer[],
  segment: CustomerSegment,
  options: SegmentOptions,
): Customer[] {
  return customers.filter((customer) => matchesSegment(customer, segment, options));
}
