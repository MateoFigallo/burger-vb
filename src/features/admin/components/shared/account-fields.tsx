"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";

export type AccountDraft = {
  username: string;
  password: string;
};

export type AccountErrors = Partial<Record<"username" | "password", string>>;

type ValidateOptions = {
  isAvailable: (username: string) => boolean;
  /** Si ya tiene contraseña, se puede dejar vacía para no cambiarla. */
  passwordOptional: boolean;
};

export function validateAccount(draft: AccountDraft, options: ValidateOptions): AccountErrors {
  const errors: AccountErrors = {};
  const username = draft.username.trim();
  if (!/^[a-zA-Z0-9._-]{3,24}$/.test(username)) {
    errors.username = "Usá entre 3 y 24 letras, números, puntos o guiones, sin espacios.";
  } else if (!options.isAvailable(username)) {
    errors.username = "Ese usuario ya está en uso.";
  }
  if (!(options.passwordOptional && draft.password === "")) {
    if (draft.password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `La contraseña tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
  }
  return errors;
}

type AccountFieldsProps = {
  idPrefix: string;
  draft: AccountDraft;
  errors: AccountErrors;
  passwordOptional: boolean;
  onChange: (draft: AccountDraft) => void;
};

/** Usuario y contraseña para entrar a la app. */
export function AccountFields({
  idPrefix,
  draft,
  errors,
  passwordOptional,
  onChange,
}: AccountFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-username`}>Usuario</Label>
        <Input
          id={`${idPrefix}-username`}
          autoComplete="off"
          autoCapitalize="none"
          className="h-11"
          value={draft.username}
          onChange={(event) => onChange({ ...draft, username: event.target.value })}
          aria-invalid={Boolean(errors.username)}
          aria-describedby={errors.username ? `${idPrefix}-username-error` : undefined}
        />
        {errors.username && (
          <p id={`${idPrefix}-username-error`} className="text-destructive text-sm">
            {errors.username}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-password`}>
          {passwordOptional ? "Nueva contraseña" : "Contraseña"}
        </Label>
        <Input
          id={`${idPrefix}-password`}
          type="text"
          autoComplete="new-password"
          className="h-11"
          placeholder={passwordOptional ? "Dejala vacía para no cambiarla" : ""}
          value={draft.password}
          onChange={(event) => onChange({ ...draft, password: event.target.value })}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={`${idPrefix}-password-hint`}
        />
        <p
          id={`${idPrefix}-password-hint`}
          className={errors.password ? "text-destructive text-sm" : "text-muted-foreground text-xs"}
        >
          {errors.password ??
            "Pasásela a la persona. Se guarda cifrada y no se puede volver a ver."}
        </p>
      </div>
    </div>
  );
}
