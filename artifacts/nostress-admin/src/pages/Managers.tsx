import React, { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { api, type Manager } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  UsersRound,
  Plus,
  Trash2,
  KeyRound,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Mail,
  User as UserIcon,
} from "lucide-react";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export default function Managers() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", firstName: "", email: "" });
  const [createLoading, setCreateLoading] = useState(false);

  const [resetTarget, setResetTarget] = useState<Manager | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Manager | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(() => {
    setIsLoading(true);
    api.managers.list()
      .then((res) => setManagers(res.managers))
      .catch(() => showToast("Impossible de charger les gestionnaires.", "error"))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, firstName, email } = createForm;
    if (!name.trim() || !firstName.trim() || !email.trim()) {
      showToast("Tous les champs sont requis.", "error");
      return;
    }
    setCreateLoading(true);
    try {
      await api.managers.create({ name: name.trim(), firstName: firstName.trim(), email: email.trim() });
      showToast("Gestionnaire créé. Les identifiants ont été envoyés par email.");
      setCreateOpen(false);
      setCreateForm({ name: "", firstName: "", email: "" });
      load();
    } catch (err: any) {
      showToast(err?.message || "Erreur lors de la création.", "error");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setResetLoading(true);
    try {
      await api.managers.resetPassword(resetTarget.id);
      showToast("Mot de passe réinitialisé et envoyé par email au gestionnaire.");
      setResetTarget(null);
    } catch (err: any) {
      showToast(err?.message || "Erreur lors de la réinitialisation.", "error");
    } finally {
      setResetLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.managers.delete(deleteTarget.id);
      showToast("Compte gestionnaire supprimé.");
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      showToast(err?.message || "Erreur lors de la suppression.", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-md ${
              toast.type === "success"
                ? "bg-green-500/20 border border-green-500/40 text-green-300"
                : "bg-destructive/20 border border-destructive/40 text-destructive"
            }`}
          >
            {toast.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{toast.msg}</span>
          </div>
        )}

        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <UsersRound className="w-6 h-6 text-primary" />
              Gestionnaires
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez les comptes gestionnaires qui ont un accès limité à l'administration.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={isLoading} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nouveau gestionnaire
            </Button>
          </div>
        </div>

        <div className="bg-muted/20 border border-border/50 rounded-xl p-4 mb-6 flex gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Accès gestionnaire :</span> les gestionnaires peuvent voir et modérer les partenaires, lieux et publications, mais ne peuvent pas supprimer de comptes, gérer les suppressions RGPD, les paramètres ni les autres gestionnaires.
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement...</div>
          ) : managers.length === 0 ? (
            <div className="p-12 text-center">
              <UsersRound className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">Aucun gestionnaire pour l'instant.</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Créez un gestionnaire pour lui déléguer certaines tâches.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gestionnaire</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Créé le</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {managers.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-400 text-xs font-bold">
                              {(m.firstName || m.name).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {m.firstName ? `${m.firstName} ${m.name}` : m.name}
                            </p>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20">
                              Gestionnaire
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {m.email}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">{formatDate(m.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 text-amber-400 border-amber-400/30 hover:bg-amber-400/10"
                            onClick={() => setResetTarget(m)}
                          >
                            <KeyRound className="w-3 h-3" />
                            Réinitialiser MDP
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(m)}
                          >
                            <Trash2 className="w-3 h-3" />
                            Supprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setCreateForm({ name: "", firstName: "", email: "" }); }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Nouveau gestionnaire
            </DialogTitle>
            <DialogDescription>
              Un mot de passe temporaire sera généré et envoyé par email au gestionnaire.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="mgr-firstname">Prénom</Label>
                <Input
                  id="mgr-firstname"
                  className="mt-1.5 bg-background"
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
                  placeholder="Jean"
                />
              </div>
              <div>
                <Label htmlFor="mgr-name">Nom</Label>
                <Input
                  id="mgr-name"
                  className="mt-1.5 bg-background"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Dupont"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="mgr-email">Email</Label>
              <Input
                id="mgr-email"
                type="email"
                className="mt-1.5 bg-background"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="gestionnaire@example.com"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={createLoading} className="gap-2">
                {createLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
                {createLoading ? "Création..." : "Créer le compte"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(o) => { if (!o) setResetTarget(null); }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <KeyRound className="w-5 h-5" />
              Réinitialiser le mot de passe
            </DialogTitle>
            <DialogDescription>
              Un nouveau mot de passe sera généré et envoyé par email à{" "}
              <strong>{resetTarget?.firstName ? `${resetTarget.firstName} ${resetTarget.name}` : resetTarget?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Annuler</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
              onClick={handleResetPassword}
              disabled={resetLoading}
            >
              <KeyRound className="w-4 h-4" />
              {resetLoading ? "En cours..." : "Réinitialiser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Supprimer le gestionnaire
            </DialogTitle>
            <DialogDescription>
              Supprimer définitivement le compte de{" "}
              <strong>{deleteTarget?.firstName ? `${deleteTarget.firstName} ${deleteTarget.name}` : deleteTarget?.name}</strong>.
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">Le gestionnaire perdra immédiatement l'accès à l'administration.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? "Suppression..." : "Supprimer le compte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
