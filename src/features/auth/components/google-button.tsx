"use client";

import { toast } from "sonner";
import { GoogleIcon } from "@/components/icons/google-icon";
import { Button } from "@/components/ui/button";

type GoogleButtonProps = {
  label: string;
};

export function GoogleButton({ label }: GoogleButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="h-11 w-full rounded-xl font-semibold"
      onClick={() =>
        toast.info("El acceso con Google todavía no está disponible.", {
          description: "Muy pronto vas a poder ingresar con tu cuenta de Google.",
        })
      }
    >
      <GoogleIcon className="size-5" />
      {label}
    </Button>
  );
}

export function AuthDivider() {
  return (
    <div className="text-muted-foreground flex items-center gap-3 text-xs uppercase">
      <span className="bg-border h-px flex-1" />
      o con tu email
      <span className="bg-border h-px flex-1" />
    </div>
  );
}
