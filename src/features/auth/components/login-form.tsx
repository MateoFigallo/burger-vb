"use client";

import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, type SignInResult } from "../services/auth-service";
import { AuthDivider, GoogleButton } from "./google-button";
import { PasswordInput } from "./password-input";

type LoginFormProps = {
  onSignedIn: (result: Extract<SignInResult, { ok: true }>) => void;
};

export function LoginForm({ onSignedIn }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError("Completá tu usuario y contraseña.");
      return;
    }

    setLoading(true);
    const result = await signIn(username, password);
    setLoading(false);

    if (result.ok) {
      setError(null);
      onSignedIn(result);
      return;
    }
    setError(result.error);
  }

  return (
    <div className="space-y-5">
      <GoogleButton label="Ingresar con Google" />
      <AuthDivider />
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-username">Usuario</Label>
          <Input
            id="login-username"
            autoComplete="username"
            autoCapitalize="none"
            placeholder="Tu usuario"
            className="h-11"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            aria-invalid={Boolean(error)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password">Contraseña</Label>
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(error)}
          />
        </div>
        {error && (
          <motion.p
            key={error}
            role="alert"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
            transition={{ duration: 0.4 }}
            className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm font-medium"
          >
            {error}
          </motion.p>
        )}
        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="h-11 w-full rounded-xl font-semibold"
        >
          {loading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          Iniciar sesión
        </Button>
      </form>
    </div>
  );
}
