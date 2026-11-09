import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Página no encontrada</h1>
      <p className="text-muted-foreground">La página que buscás no existe o fue movida.</p>
      <Button nativeButton={false} render={<Link href="/" />} className="min-h-11 px-4">
        Volver al inicio
      </Button>
    </main>
  );
}
