import React, { useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "components/ui/button";
import { Label } from "components/ui/label";
import {
  Bold, Italic, UnderlineIcon, List, ListOrdered,
  CheckCircle2, Send, AlertCircle, Bug, ImagePlus, X,
} from "lucide-react";

const API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://api.no-stress.net/api"
    : `${(process.env.PUBLIC_URL || "").replace(/\/$/, "").replace("/nostress-web", "")}/api`;

const fieldClass =
  "w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition";

const MAX_IMAGES = 5;
const MAX_SIZE_MB = 5;

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

interface ImagePreview {
  file: File;
  url: string;
}

export default function TesterFeedback() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: "Décrivez le bug ou votre retour en détail…" }),
    ],
    editorProps: {
      attributes: {
        class: "min-h-[200px] px-3 py-2 text-sm text-foreground focus:outline-none prose prose-sm prose-invert max-w-none",
      },
    },
  });

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_IMAGES - images.length;
    const toAdd = files.slice(0, remaining);
    const oversized = toAdd.filter((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (oversized.length > 0) {
      setErrors((prev) => ({ ...prev, images: `Chaque image doit faire moins de ${MAX_SIZE_MB} Mo.` }));
      e.target.value = "";
      return;
    }
    setErrors((prev) => { const n = { ...prev }; delete n.images; return n; });
    const previews: ImagePreview[] = toAdd.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...previews]);
    e.target.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

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
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("email", email.trim());
      if (phone.trim()) formData.append("phone", phone.trim());
      formData.append("message", editor?.getHTML() ?? "");
      images.forEach(({ file }) => formData.append("screenshots", file));

      const res = await fetch(`${API_BASE}/feedback`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erreur ${res.status}`);
      }
      setSubmitted(true);
      images.forEach(({ url }) => URL.revokeObjectURL(url));
    } catch (err: any) {
      setServerError(err?.message || "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setSubmitted(false);
    setServerError(null);
    setName("");
    setEmail("");
    setPhone("");
    setImages([]);
    editor?.commands.clearContent();
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
              <Button onClick={resetForm} variant="outline">
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
                      <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} title="Gras">
                        <Bold className="w-4 h-4" />
                      </ToolbarButton>
                      <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} title="Italique">
                        <Italic className="w-4 h-4" />
                      </ToolbarButton>
                      <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline")} title="Souligné">
                        <UnderlineIcon className="w-4 h-4" />
                      </ToolbarButton>
                      <div className="w-px h-4 bg-border mx-1" />
                      <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")} title="Liste à puces">
                        <List className="w-4 h-4" />
                      </ToolbarButton>
                      <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")} title="Liste numérotée">
                        <ListOrdered className="w-4 h-4" />
                      </ToolbarButton>
                    </div>
                    <EditorContent editor={editor} />
                  </div>
                  {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
                </div>

                {/* Screenshot upload */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>
                      Captures d'écran{" "}
                      <span className="text-muted-foreground text-xs font-normal">(optionnel · max {MAX_IMAGES} images · {MAX_SIZE_MB} Mo chacune)</span>
                    </Label>
                    <span className="text-xs text-muted-foreground">{images.length}/{MAX_IMAGES}</span>
                  </div>

                  {images.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {images.map((img, i) => (
                        <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                          <img
                            src={img.url}
                            alt={`Capture ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {images.length < MAX_IMAGES && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-square rounded-lg border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                        >
                          <ImagePlus className="w-5 h-5" />
                          <span className="text-xs">Ajouter</span>
                        </button>
                      )}
                    </div>
                  )}

                  {images.length === 0 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full rounded-lg border border-dashed border-border bg-muted/20 py-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                    >
                      <ImagePlus className="w-6 h-6" />
                      <div className="text-center">
                        <p className="text-sm font-medium">Ajouter des captures d'écran</p>
                        <p className="text-xs">PNG, JPG, WebP · max {MAX_SIZE_MB} Mo par image</p>
                      </div>
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  {errors.images && <p className="text-xs text-destructive">{errors.images}</p>}
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
