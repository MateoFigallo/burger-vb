"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthDivider, GoogleButton } from "./google-button";
import { PasswordInput } from "./password-input";

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");

    if (!event.currentTarget.checkValidity()) {
      setError("Completá todos los campos con datos válidos.");
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setError(null);
    toast.info("El registro todavía no está habilitado.", {
      description: "Mientras tanto, podés hacer tu pedido sin cuenta.",
    });
  }

  return (
    <div className="space-y-5">
      <GoogleButton label="Registrarme con Google" />
      <AuthDivider />
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="register-name">Nombre completo</Label>
          <Input
            id="register-name"
            name="name"
            autoComplete="name"
            required
            minLength={2}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-email">Email</Label>
          <Input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="tu@email.com"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-password">Contraseña</Label>
          <PasswordInput
            id="register-password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            aria-describedby="register-password-hint"
          />
          <p id="register-password-hint" className="text-muted-foreground text-xs">
            Mínimo 8 caracteres.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-confirmation">Repetí la contraseña</Label>
          <PasswordInput
            id="register-confirmation"
            name="confirmation"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        {error && (
          <p
            role="alert"
            className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm font-medium"
          >
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="h-11 w-full rounded-xl font-semibold">
          Crear cuenta
        </Button>
      </form>
    </div>
  );
}
