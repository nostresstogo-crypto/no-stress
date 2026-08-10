import React, { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Navbar } from "components/layout/Navbar";
import { Footer } from "components/layout/Footer";
import { Button } from "components/ui/button";
import { Label } from "components/ui/label";
import { CheckCircle2, Mail, MapPin, Send, AlertCircle, MessageCircle } from "lucide-react";
import { useLanguage } from "lib/i18n";
import { CONTACT_EMAIL } from "lib/constants";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (process.env.NODE_ENV === "production"
    ? "https://api.no-stress.net/api"
    : `${(process.env.PUBLIC_URL || "").replace(/\/$/, "").replace("/nostress-web", "")}/api`);

const fieldClass =
  "w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition";

const initialValues = { name: "", email: "", subject: "", message: "" };

export default function Contact() {
  const { t } = useLanguage();
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const ContactSchema = Yup.object().shape({
    name: Yup.string()
      .trim()
      .min(2, t("contact.val.name.min"))
      .max(100, t("contact.val.name.max"))
      .required(t("contact.val.name.required")),
    email: Yup.string()
      .trim()
      .email(t("contact.val.email.invalid"))
      .required(t("contact.val.email.required")),
    subject: Yup.string()
      .trim()
      .min(3, t("contact.val.subject.min"))
      .max(200, t("contact.val.subject.max"))
      .required(t("contact.val.subject.required")),
    message: Yup.string()
      .trim()
      .min(10, t("contact.val.message.min"))
      .max(5000, t("contact.val.message.max"))
      .required(t("contact.val.message.required")),
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-4xl font-bold mb-4 text-primary">{t("contact.title")}</h1>
          <p className="text-muted-foreground mb-8 text-lg">{t("contact.sub")}</p>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
              <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm font-medium hover:text-primary transition">
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("contact.location")}</p>
                <p className="text-sm font-medium">Lomé, Togo</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">WhatsApp</p>
                <a
                  href="https://wa.me/22896847164"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium hover:text-primary transition"
                >
                  +228 96 84 71 64
                </a>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
              <Send className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("contact.response")}</p>
                <p className="text-sm font-medium">{t("contact.response.value")}</p>
              </div>
            </div>
          </div>

          {/* Social links */}
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 mb-8">
            <p className="text-sm text-muted-foreground shrink-0">{t("contact.follow")}</p>
            <div className="flex gap-3">
              <a
                href="https://www.tiktok.com/@nostress_events"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
                </svg>
              </a>
              <a
                href="https://www.instagram.com/nostress_events_"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162S8.597 18.163 12 18.163s6.162-2.759 6.162-6.162S15.403 5.838 12 5.838zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="https://www.facebook.com/share/1JP3WvE1Ng/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>
          </div>

          {submitted ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center" data-testid="contact-success">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-4">{t("contact.success.title")}</h2>
              <p className="text-muted-foreground mb-6">{t("contact.success.body")}</p>
              <Button
                onClick={() => { setSubmitted(false); setServerError(null); }}
                variant="outline"
              >
                {t("contact.success.another")}
              </Button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-6 md:p-8">
              <Formik
                initialValues={initialValues}
                validationSchema={ContactSchema}
                onSubmit={async (values, { setSubmitting, resetForm }) => {
                  setServerError(null);
                  try {
                    const res = await fetch(`${API_BASE}/contact`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(values),
                    });
                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}));
                      throw new Error(data.error || `Erreur ${res.status}`);
                    }
                    resetForm();
                    setSubmitted(true);
                  } catch (err: any) {
                    setServerError(err?.message || t("contact.error.default"));
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                {({ isSubmitting, errors, touched }) => (
                  <Form className="space-y-5" data-testid="contact-form">
                    {serverError && (
                      <div className="flex gap-3 items-start bg-destructive/10 border border-destructive/20 p-4 rounded-lg" data-testid="contact-error">
                        <AlertCircle className="text-destructive w-5 h-5 shrink-0 mt-0.5" />
                        <p className="text-sm text-destructive">{serverError}</p>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t("contact.name")}</Label>
                        <Field
                          id="name"
                          name="name"
                          placeholder={t("contact.name.placeholder")}
                          className={`${fieldClass} ${errors.name && touched.name ? "border-destructive focus:ring-destructive" : ""}`}
                          data-testid="input-name"
                        />
                        <ErrorMessage name="name" component="p" className="text-xs text-destructive" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">{t("contact.email")}</Label>
                        <Field
                          id="email"
                          name="email"
                          type="email"
                          placeholder="email@exemple.com"
                          className={`${fieldClass} ${errors.email && touched.email ? "border-destructive focus:ring-destructive" : ""}`}
                          data-testid="input-email"
                        />
                        <ErrorMessage name="email" component="p" className="text-xs text-destructive" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">{t("contact.subject")}</Label>
                      <Field
                        id="subject"
                        name="subject"
                        placeholder={t("contact.subject.placeholder")}
                        className={`${fieldClass} ${errors.subject && touched.subject ? "border-destructive focus:ring-destructive" : ""}`}
                        data-testid="input-subject"
                      />
                      <ErrorMessage name="subject" component="p" className="text-xs text-destructive" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">{t("contact.message")}</Label>
                      <Field
                        as="textarea"
                        id="message"
                        name="message"
                        rows={6}
                        placeholder={t("contact.message.placeholder")}
                        className={`${fieldClass} resize-y min-h-[140px] ${errors.message && touched.message ? "border-destructive focus:ring-destructive" : ""}`}
                        data-testid="input-message"
                      />
                      <ErrorMessage name="message" component="p" className="text-xs text-destructive" />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                      data-testid="button-submit"
                    >
                      {isSubmitting ? (
                        t("contact.sending")
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <Send className="w-4 h-4" />
                          {t("contact.send")}
                        </span>
                      )}
                    </Button>
                  </Form>
                )}
              </Formik>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
