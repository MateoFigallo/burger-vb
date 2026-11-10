import Link from "next/link";
import { Hamburger } from "lucide-react";
import { cn } from "@/lib/utils";

type LogoProps = {
  href?: string;
  className?: string;
};

export function Logo({ href = "/", className }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "font-heading focus-visible:ring-ring/50 flex min-h-11 items-center gap-2.5 rounded-lg text-xl font-extrabold tracking-tight outline-none focus-visible:ring-3",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="bg-primary text-primary-foreground shadow-primary/30 grid size-9 place-items-center rounded-xl shadow-md"
      >
        <Hamburger className="size-5" />
      </span>
      <span>
        Burger <span className="text-brand">VB</span>
      </span>
    </Link>
  );
}
