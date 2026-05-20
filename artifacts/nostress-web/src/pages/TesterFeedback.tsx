import React, { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "components/ui/button";
import { Label } from "components/ui/label";
import {
  Bold, Italic, UnderlineIcon, List, ListOrdered,
  CheckCircle2, Send, AlertCircle, Bug,
} from "lucide-react";

const API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://api.no-stress.net/api"
    : `${(process.env.PUBLIC_URL || "").replace(/\/$/, "").replace("/nostress-web", "")}/api`;

const fieldClass =
  "w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition";

function ToolbarButton({
  onClick, active, title, children,
}: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded hover:bg-muted transition-colors ${active ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

export default function TesterFeedback() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: "Décrivez le bug ou votre retour en détail…" }),
    ],
    editorProps: {
      attributes: {
        class:
          "min-h-[200px] px-3 py-2 text-sm text-foreground focus:outline-none prose prose-sm prose-invert max-w-none",
      },
    },
  });

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) errs.name = "Nom requis (minimum 2 caractères).";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "Adresse email invalide.";
    if (phone.trim() && (phone.trim().length < 6 || phone.trim().length > 20)) errs.phone = "Numéro de téléphone invalide.";
    const msgText = editor?.getText().trim() ?? "";
    if (msgText.length < 10) errs.message = "Veuillez décrire votre retour (minimum 10 caractères).";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch(`${API_BASE}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          message: editor?.getHTML() ?? "",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erreur ${res.status}`);
      }
      setSubmitted(true);
    } catch (err: any) {
      setServerError(err?.message || "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1 flex items-start justify-center pt-12 pb-16 px-4">
        <div className="w-full max-w-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bug className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Feedback Testeur</h1>
              <p className="text-sm text-muted-foreground">NoStress · Closed Testing</p>
            </div>
          </div>
          <p className="text-muted-foreground text-sm mb-8">
            Merci de participer aux tests. Décrivez les bugs ou retours que vous souhaitez partager.
          </p>

          {submitted ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
              <h2 className="text-xl font-bold mb-3">Feedback envoyé !</h2>
              <p className="text-muted-foreground mb-6">
                Merci pour votre retour. Notre équipe l'examinera dans les plus brefs délais.
              </p>
              <Button
                onClick={() => {
                  setSubmitted(false);
                  setServerError(null);
                  setName("");
                  setEmail("");
                  setPhone("");
                  editor?.commands.clearContent();
                }}
                variant="outline"
              >
                Envoyer un autre feedback
              </Button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {serverError && (
                  <div className="flex gap-3 items-start bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                    <AlertCircle className="text-destructive w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{serverError}</p>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Nom complet <span className="text-destructive">*</span></Label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jean Dupont"
                      className={`${fieldClass} ${errors.name ? "border-destructive focus:ring-destructive" : ""}`}
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@exemple.com"
                      className={`${fieldClass} ${errors.email ? "border-destructive focus:ring-destructive" : ""}`}
                    />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">
                    Téléphone <span className="text-muted-foreground text-xs font-normal">(optionnel)</span>
                  </Label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+228 90 00 00 00"
                    className={`${fieldClass} ${errors.phone ? "border-destructive focus:ring-destructive" : ""}`}
                  />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Description <span className="text-destructive">*</span></Label>
                  <div className={`rounded-md border ${errors.message ? "border-destructive" : "border-border"} bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition`}>
                    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30">
                      <ToolbarButton
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                        active={editor?.isActive("bold")}
                        title="Gras"
                      >
                        <Bold className="w-4 h-4" />
                      </ToolbarButton>
                      <ToolbarButton
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                        active={editor?.isActive("italic")}
                        title="Italique"
                      >
                        <Italic className="w-4 h-4" />
                      </ToolbarButton>
                      <ToolbarButton
                        onClick={() => editor?.chain().focus().toggleUnderline().run()}
                        active={editor?.isActive("underline")}
                        title="Souligné"
                      >
                        <UnderlineIcon className="w-4 h-4" />
                      </ToolbarButton>
                      <div className="w-px h-4 bg-border mx-1" />
                      <ToolbarButton
                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                        active={editor?.isActive("bulletList")}
                        title="Liste à puces"
                      >
                        <List className="w-4 h-4" />
                      </ToolbarButton>
                      <ToolbarButton
                        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                        active={editor?.isActive("orderedList")}
                        title="Liste numérotée"
                      >
                        <ListOrdered className="w-4 h-4" />
                      </ToolbarButton>
                    </div>
                    <EditorContent editor={editor} />
                  </div>
                  {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    "Envoi en cours…"
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Envoyer le feedback
                    </span>
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
