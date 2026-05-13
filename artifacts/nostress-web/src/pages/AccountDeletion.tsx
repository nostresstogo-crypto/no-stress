import React, { useState, useMemo } from "react";
import { Navbar } from "components/layout/Navbar";
import { Footer } from "components/layout/Footer";
import { Button } from "components/ui/button";
import { Input } from "components/ui/input";
import { Label } from "components/ui/label";
import { Checkbox } from "components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useLanguage } from "lib/i18n";

const API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://api.no-stress.net/api"
    : `${(process.env.PUBLIC_URL || "")
        .replace(/\/$/, "")
        .replace("/nostress-web", "")}/api`;

export default function AccountDeletion() {
  const { t } = useLanguage();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [name, setName] = useState(params.get("name") || "");
  const [email, setEmail] = useState(params.get("email") || "");
  const initialType = params.get("type") === "partner" ? "partner" : "user";
  const [accountType, setAccountType] = useState<"user" | "partner">(initialType);
  const [reason, setReason] = useState<string>("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const REASON_LABELS: Record<string, string> = {
    not_useful: t("delete.reason.not_useful"),
    privacy: t("delete.reason.privacy"),
    too_many_emails: t("delete.reason.too_many_emails"),
    other: t("delete.reason.other"),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!confirmed) {
      setError(t("delete.error.confirm"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/account/deletion-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          accountType,
          reason: reason ? REASON_LABELS[reason] || reason : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || t("delete.error.server"));
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || t("delete.error.network"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <h1 className="text-4xl font-bold mb-4 text-primary">{t("delete.title")}</h1>
          <p className="text-muted-foreground mb-8 text-lg">{t("delete.sub")}</p>

          {submitted ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-4">{t("delete.success.title")}</h2>
              <p className="text-muted-foreground mb-6">{t("delete.success.body")}</p>
              <p className="text-sm text-muted-foreground">
                {t("delete.success.contact")}{" "}
                <a href="mailto:nostresstogo@gmail.com" className="text-primary hover:underline">
                  nostresstogo@gmail.com
                </a>
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-6 md:p-8">
              <div className="flex gap-4 items-start bg-destructive/10 border border-destructive/20 p-4 rounded-lg mb-8">
                <AlertTriangle className="text-destructive w-6 h-6 shrink-0 mt-1" />
                <div className="text-sm">
                  <p className="font-semibold text-destructive mb-1">{t("delete.warning.title")}</p>
                  <p className="text-muted-foreground">{t("delete.warning.body")}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("delete.name")}</Label>
                    <Input
                      id="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("delete.name.placeholder")}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t("delete.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@exemple.com"
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("delete.type")}</Label>
                    <Select
                      required
                      value={accountType}
                      onValueChange={(v) => setAccountType(v as "user" | "partner")}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder={t("delete.type.placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">{t("delete.type.user")}</SelectItem>
                        <SelectItem value="partner">{t("delete.type.partner")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("delete.reason")}</Label>
                    <Select value={reason} onValueChange={setReason}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder={t("delete.reason.placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_useful">{t("delete.reason.not_useful")}</SelectItem>
                        <SelectItem value="privacy">{t("delete.reason.privacy")}</SelectItem>
                        <SelectItem value="too_many_emails">{t("delete.reason.too_many_emails")}</SelectItem>
                        <SelectItem value="other">{t("delete.reason.other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-start space-x-3 pt-4 border-t border-border">
                  <Checkbox
                    id="confirm"
                    required
                    className="mt-1"
                    checked={confirmed}
                    onCheckedChange={(v) => setConfirmed(Boolean(v))}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="confirm" className="text-base font-medium">
                      {t("delete.confirm.label")}
                    </Label>
                    <p className="text-sm text-muted-foreground">{t("delete.confirm.desc")}</p>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full h-12 text-lg font-semibold"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t("delete.submitting")}
                    </>
                  ) : (
                    t("delete.submit")
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
