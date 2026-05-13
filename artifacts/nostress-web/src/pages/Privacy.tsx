import React from "react";
import { Navbar } from "components/layout/Navbar";
import { Footer } from "components/layout/Footer";
import {
  PRIVACY_FR,
  PRIVACY_EN,
  LAST_UPDATED_FR,
  LAST_UPDATED_EN,
  CONTACT,
} from "@workspace/legal-content";
import { useLanguage } from "lib/i18n";

export default function Privacy() {
  const { t, lang } = useLanguage();
  const sections = lang === "en" ? PRIVACY_EN : PRIVACY_FR;
  const lastUpdated = lang === "en" ? LAST_UPDATED_EN : LAST_UPDATED_FR;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-4xl font-bold mb-4 text-primary">{t("privacy.title")}</h1>
          <p className="text-muted-foreground mb-12">{lastUpdated}</p>

          <div className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-li:text-muted-foreground">
            {sections.map((s, i) => (
              <section key={i}>
                <h2>{s.title}</h2>
                {(s.paragraphs || []).map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
                {s.bullets && (
                  <ul>
                    {s.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <h2>Contact</h2>
            <p>
              {t("privacy.contact.intro")}<br />
              <strong>E-mail :</strong> <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a><br />
              <strong>WhatsApp :</strong> {CONTACT.whatsapp}<br />
              <strong>{lang === "en" ? "Address" : "Adresse"} :</strong> {CONTACT.address}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
