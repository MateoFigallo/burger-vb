import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AuthSheet } from "@/features/auth";
import { CartButton, CartFloatingBar, CartSheet } from "@/features/cart";
import { StoreFooter } from "@/features/home";
import { StoreStatusBanner } from "@/features/store-status";

type ShopLayoutProps = {
  children: ReactNode;
};

export default function ShopLayout({ children }: ShopLayoutProps) {
  return (
    <>
      <SiteHeader
        actions={
          <>
            <ThemeToggle />
            <AuthSheet />
            <CartButton />
          </>
        }
      />
      <StoreStatusBanner />
      <main className="flex-1">{children}</main>
      <StoreFooter />
      <CartSheet />
      <CartFloatingBar />
    </>
  );
}
