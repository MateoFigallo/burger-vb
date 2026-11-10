"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { CircleUser, LayoutDashboard, User } from "lucide-react";
import { getPanelHome } from "@/config/panel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "../hooks/use-session";
import type { SignInResult } from "../services/auth-service";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";

type AuthTab = "login" | "register";

const TAB_COPY: Record<AuthTab, { title: string; description: string }> = {
  login: {
    title: "¡Hola de nuevo!",
    description: "Ingresá a tu cuenta para pedir más rápido.",
  },
  register: {
    title: "Creá tu cuenta",
    description: "Guardá tus datos y repetí tus pedidos favoritos.",
  },
};

export function AuthSheet() {
  const router = useRouter();
  const { viewer } = useSession();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AuthTab>("login");

  if (viewer?.kind === "customer") {
    return (
      <Button
        variant="outline"
        className="h-11 rounded-full px-4 font-semibold"
        nativeButton={false}
        render={<Link href="/mi-cuenta" />}
      >
        <CircleUser aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">Mi cuenta</span>
        <span className="sr-only sm:hidden">Ir a mi cuenta</span>
      </Button>
    );
  }

  if (viewer) {
    return (
      <Button
        variant="outline"
        className="h-11 rounded-full px-4 font-semibold"
        nativeButton={false}
        render={<Link href={getPanelHome(viewer.modules) ?? "/dashboard"} />}
      >
        <LayoutDashboard aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">Panel</span>
        <span className="sr-only sm:hidden">Ir al panel</span>
      </Button>
    );
  }

  function handleSignedIn(result: Extract<SignInResult, { ok: true }>) {
    setOpen(false);
    toast.success(result.greeting);
    router.push(result.redirectTo);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            className="h-11 rounded-full px-4 font-semibold"
            aria-label="Ingresar o crear cuenta"
          />
        }
      >
        <User aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">Ingresar</span>
      </SheetTrigger>
      <SheetContent className="[&>[data-slot=sheet-close]]:text-primary-foreground [&>[data-slot=sheet-close]]:hover:text-primary-foreground w-full gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-md [&>[data-slot=sheet-close]]:hover:bg-white/15">
        <div className="bg-primary text-primary-foreground relative overflow-hidden px-6 pt-10 pb-8">
          <div
            aria-hidden="true"
            className="absolute -top-16 -right-16 size-48 rounded-full bg-white/10"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-20 -left-10 size-40 rounded-full bg-black/10"
          />
          <SheetHeader className="relative p-0">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <SheetTitle className="text-primary-foreground text-2xl font-extrabold">
                {TAB_COPY[tab].title}
              </SheetTitle>
              <SheetDescription className="text-primary-foreground/85 mt-1">
                {TAB_COPY[tab].description}
              </SheetDescription>
            </motion.div>
          </SheetHeader>
        </div>

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value === "register" ? "register" : "login")}
          className="gap-6 px-6 py-6"
        >
          <TabsList className="h-11! w-full rounded-xl">
            <TabsTrigger value="login" className="rounded-lg font-semibold">
              Iniciar sesión
            </TabsTrigger>
            <TabsTrigger value="register" className="rounded-lg font-semibold">
              Crear cuenta
            </TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
              <LoginForm onSignedIn={handleSignedIn} />
            </motion.div>
          </TabsContent>
          <TabsContent value="register">
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
              <RegisterForm />
            </motion.div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
