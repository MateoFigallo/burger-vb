export type NavItem = {
  title: string;
  href: string;
};

export type SiteConfig = {
  name: string;
  description: string;
  nav: NavItem[];
};

export const siteConfig: SiteConfig = {
  name: "Burger VB",
  description: "Burger VB",
  nav: [],
};
