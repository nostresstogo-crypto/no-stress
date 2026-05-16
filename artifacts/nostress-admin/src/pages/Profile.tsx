import React, { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, KeyRound, Mail, User as UserIcon, Eye, EyeOff } from "lucide-react";

export default function Profile() {
  const { admin, logout } = useAuth();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "Champs requis", description: "Tous les champs sont obligatoires.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 12) {
      toast({
        title: "Mot de passe trop court",
        description: "Le nouveau mot de passe doit faire au moins 12 caractères.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Confirmation invalide",
        description: "La confirmation ne correspond pas au nouveau mot de passe.",
        variant: "destructive",
      });
      return;
    }
    if (currentPassword === newPassword) {
      toast({
        title: "Mot de passe identique",
        description: "Le nouveau mot de passe doit être différent de l'ancien.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      await api.admin.changePassword(currentPassword, newPassword);
      toast({
        title: "Mot de passe modifié",
        description: "Vous allez être déconnecté. Reconnectez-vous avec votre nouveau mot de passe.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        logout();
      }, 1500);
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err?.message || "Impossible de modifier le mot de passe.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-full bg-gradient-to-br from-background via-background to-primary/5">
        <div className="mx-auto max-w-3xl px-4 md:px-8 py-6 md:py-10">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 mb-3">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Mon compte
              </span>
            </div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Profil administrateur</h1>
            <p className="text-muted-foreground mt-2">Gérez vos informations et la sécurité de votre compte.</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm mb-6">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-primary" /> Informations
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Nom</Label>
                <div className="mt-1 px-3 py-2 rounded-lg bg-background/40 border border-border/50 text-sm text-foreground">
                  {admin?.name || "—"}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email
                </Label>
                <div className="mt-1 px-3 py-2 rounded-lg bg-background/40 border border-border/50 text-sm text-foreground">
                  {admin?.email || "—"}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Rôle</Label>
                <div className="mt-1">
                  {admin?.role === "superadmin" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
                      <Shield className="w-3 h-3" /> Super Administrateur
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      <UserIcon className="w-3 h-3" /> Gestionnaire
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" /> Changer le mot de passe
            </h2>
            <p className="text-xs text-muted-foreground mb-5">
              Minimum 12 caractères. Choisissez un mot de passe robuste, différent de l'ancien.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                <div className="relative mt-1">
                  <Input
                    id="currentPassword"
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    data-testid="input-current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                    aria-label={showCurrent ? "Masquer" : "Afficher"}
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <div className="relative mt-1">
                  <Input
                    id="newPassword"
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    data-testid="input-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                    aria-label={showNew ? "Masquer" : "Afficher"}
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword && newPassword.length < 12 && (
                  <p className="text-xs text-amber-400 mt-1">
                    {12 - newPassword.length} caractère(s) restant(s) (minimum 12).
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type={showNew ? "text" : "password"}
                  className="mt-1"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  data-testid="input-confirm-password"
                />
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-xs text-rose-400 mt-1">La confirmation ne correspond pas.</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto"
                data-testid="button-change-password"
              >
                {submitting ? "Modification en cours…" : "Mettre à jour le mot de passe"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
