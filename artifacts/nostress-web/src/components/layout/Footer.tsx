import React from "react";
import { Link } from "wouter";
import { useLanguage } from "lib/i18n";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="inline-block mb-4">
              <span className="text-2xl font-bold text-primary tracking-tighter">NoStress</span>
            </Link>
            <p className="text-muted-foreground max-w-sm">{t("footer.desc")}</p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">{t("footer.links")}</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("nav.home")}
                </Link>
              </li>
              <li>
                <Link href="/conditions-utilisation" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.terms")}
                </Link>
              </li>
              <li>
                <Link href="/politique-confidentialite" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                <Link href="/suppression-compte" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.delete")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">{t("footer.contact")}</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>contact@nostress.tg</li>
              <li>Lomé, Togo</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} NoStress. {t("footer.rights")}</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#006A4E]"></span>
              <span className="w-3 h-3 rounded-full bg-[#FFCD00]"></span>
              <span className="w-3 h-3 rounded-full bg-[#D21034]"></span>
              {t("footer.proudly")}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
