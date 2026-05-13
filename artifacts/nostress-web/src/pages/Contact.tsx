import React, { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Navbar } from "components/layout/Navbar";
import { Footer } from "components/layout/Footer";
import { Button } from "components/ui/button";
import { Label } from "components/ui/label";
import { CheckCircle2, Mail, MapPin, Send, AlertCircle } from "lucide-react";
import { useLanguage } from "lib/i18n";

const API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://api.no-stress.net/api"
    : `${(process.env.PUBLIC_URL || "").replace(/\/$/, "").replace("/nostress-web", "")}/api`;

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

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
              <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                <a href="mailto:nostresstogo@gmail.com" className="text-sm font-medium hover:text-primary transition">
                  nostresstogo@gmail.com
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
              <Send className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("contact.response")}</p>
                <p className="text-sm font-medium">{t("contact.response.value")}</p>
              </div>
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
