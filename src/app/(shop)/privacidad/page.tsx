import type { Metadata } from "next";
import { LegalDocument } from "@/features/system";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function Page() {
  return <LegalDocument doc="privacidad" />;
}
