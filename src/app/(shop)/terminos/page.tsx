import type { Metadata } from "next";
import { LegalDocument } from "@/features/system";

export const metadata: Metadata = { title: "Términos y condiciones" };

export default function Page() {
  return <LegalDocument doc="terminos" />;
}
