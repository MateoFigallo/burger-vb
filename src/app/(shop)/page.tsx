import {
  Hero,
  LoyaltyShowcase,
  ReviewsLocation,
} from "@/features/home";
import { MenuSection } from "@/features/menu";

export default function HomePage() {
  return (
    <>
      <Hero />
      <MenuSection />
      <LoyaltyShowcase />
      <ReviewsLocation />
    </>
  );
}
