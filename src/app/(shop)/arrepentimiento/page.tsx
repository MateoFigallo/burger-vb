import type { Metadata } from "next";
import { LegalDocument } from "@/features/system";

export const metadata: Metadata = { title: "Botón de arrepentimiento" };

export default function Page() {
  return <LegalDocument doc="arrepentimiento" />;
}
