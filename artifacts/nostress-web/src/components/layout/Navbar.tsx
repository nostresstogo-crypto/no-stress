import React from "react";
import { Link, useLocation } from "wouter";
import { Button } from "components/ui/button";
import { Menu, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "components/ui/sheet";
import { useLanguage } from "lib/i18n";

export function Navbar() {
  const [location] = useLocation();
  const { t, lang, setLang } = useLanguage();

  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/conditions-utilisation", label: t("nav.terms") },
    { href: "/politique-confidentialite", label: t("nav.privacy") },
    { href: "/suppression-compte", label: t("nav.delete") },
    { href: "/contact", label: t("nav.contact") },
  ];

  const LangSwitcher = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setLang("fr")}
          className={lang === "fr" ? "text-primary font-semibold" : ""}
        >
          🇫🇷 Français
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLang("en")}
          className={lang === "en" ? "text-primary font-semibold" : ""}
        >
          🇬🇧 English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary tracking-tighter">NoStress</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location === link.href ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <LangSwitcher />

          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            {t("nav.download")}
          </Button>
        </div>

        <div className="md:hidden flex items-center gap-2">
          <LangSwitcher />

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-background border-border">
              <div className="flex flex-col gap-4 mt-8">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-lg font-medium transition-colors hover:text-primary ${
                      location === link.href ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <Button className="mt-4 bg-primary text-primary-foreground">
                  {t("nav.download")}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
