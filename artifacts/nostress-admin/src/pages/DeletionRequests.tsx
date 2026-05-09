import React, { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { api, type DeletionRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Trash2,
  CheckCircle,
  Clock,
  Search,
  User,
  Shield,
  AlertTriangle,
  Mail,
  Calendar,
  Link2,
  Unlink,
  RefreshCw,
} from "lucide-react";

const REASON_LABELS: Record<string, string> = {
  privacy: "Préoccupations liées à la vie privée",
  not_useful: "Application non utile",
  too_many_emails: "Trop de notifications",
  other: "Autre raison",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-400/10 text-yellow-400">
        <Clock className="w-3.5 h-3.5" />
        En attente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-400/10 text-green-400">
      <CheckCircle className="w-3.5 h-3.5" />
      Traité
    </span>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} à ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DeletionRequests() {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selected, setSelected] = useState<DeletionRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadRequests = useCallback(() => {
    setIsLoading(true);
    api.deletionRequests.list().then(setRequests).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filtered = requests.filter((r) => {
    const matchStatus = !filterStatus || r.status === filterStatus;
    const matchSearch =
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleProcess = async (req: DeletionRequest) => {
    setActionLoading(true);
    try {
      await api.deletionRequests.process(req.id);
      showToast("Demande marquée comme traitée.");
      loadRequests();
      setDetailOpen(false);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await api.deletionRequests.deleteAccount(selected.id);
      showToast(res.message);
      loadRequests();
      setConfirmDeleteOpen(false);
      setDetailOpen(false);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
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

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Demandes de suppression</h1>
            <p className="text-muted-foreground mt-1">
              Gérer les demandes de suppression de compte (conformité RGPD / App Store)
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadRequests} disabled={isLoading} className="flex-shrink-0 gap-2">
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        <div className="bg-muted/20 border border-yellow-500/20 rounded-lg px-4 py-3 flex items-start gap-3 mb-6">
          <Shield className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            Les demandes doivent être traitées sous <strong className="text-foreground">30 jours</strong>. Le bouton{" "}
            <span className="text-destructive font-medium">« Supprimer le compte »</span> efface définitivement le compte et toutes ses données (favoris, lieux, événements, sessions).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <div className="flex gap-2">
            {["", "pending", "processed"].map((s) => (
              <Button
                key={s}
                variant={filterStatus === s ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(s)}
                className={filterStatus === s ? "" : "text-muted-foreground"}
              >
                {s === "" ? "Toutes" : s === "pending" ? "En attente" : "Traitées"}
              </Button>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Trash2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Aucune demande trouvée.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Utilisateur</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Compte lié</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((req) => {
                    const linkedId = req.userId || req.partnerId;
                    return (
                      <tr key={req.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-foreground text-sm">{req.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{req.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${
                              req.accountType === "partner"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {req.accountType === "partner" ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                            {req.accountType === "partner" ? "Partenaire" : "Utilisateur"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {linkedId ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
                              <Link2 className="w-3 h-3" />
                              {req.userId ? `User #${req.userId}` : `Partner #${req.partnerId}`}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-yellow-400">
                              <Unlink className="w-3 h-3" />
                              Non trouvé
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={req.status} />
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground">{formatDate(req.createdAt)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setSelected(req);
                                setDetailOpen(true);
                              }}
                            >
                              Détails
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Détail demande */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Détail de la demande
            </DialogTitle>
            <DialogDescription>
              {selected && <StatusBadge status={selected.status} />}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Nom</p>
                    <p className="text-sm font-medium text-foreground">{selected.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm text-foreground">{selected.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Type de compte</p>
                    <p className="text-sm text-foreground">
                      {selected.accountType === "partner" ? "Partenaire" : "Utilisateur"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  {selected.userId || selected.partnerId ? (
                    <Link2 className="w-4 h-4 text-green-400 mt-0.5" />
                  ) : (
                    <Unlink className="w-4 h-4 text-yellow-400 mt-0.5" />
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Compte identifié</p>
                    <p className="text-sm text-foreground">
                      {selected.userId
                        ? `Utilisateur #${selected.userId}`
                        : selected.partnerId
                          ? `Partenaire #${selected.partnerId}`
                          : "Aucun compte trouvé pour cet email"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date de la demande</p>
                    <p className="text-sm text-foreground">{formatDate(selected.createdAt)}</p>
                  </div>
                </div>
                {selected.reason && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Raison</p>
                    <p className="text-sm text-foreground">
                      {REASON_LABELS[selected.reason] || selected.reason}
                    </p>
                  </div>
                )}
              </div>

              {selected.status === "pending" && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                  <p className="font-medium mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Suppression définitive
                  </p>
                  <p className="text-destructive/80">
                    « Supprimer le compte » efface immédiatement le compte et toutes les données associées (favoris, lieux, événements, sessions). Un email de confirmation est envoyé à l'utilisateur.
                  </p>
                </div>
              )}
            </div>
          )}

          {selected?.status === "pending" && (
            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button variant="outline" onClick={() => setDetailOpen(false)} disabled={actionLoading}>
                Fermer
              </Button>
              <Button
                variant="outline"
                className="text-green-400 border-green-400/30 hover:bg-green-400/10"
                onClick={() => selected && handleProcess(selected)}
                disabled={actionLoading}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Marquer traité
              </Button>
              <Button
                variant="destructive"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={actionLoading || (!selected.userId && !selected.partnerId)}
                title={
                  !selected.userId && !selected.partnerId
                    ? "Aucun compte trouvé pour cet email"
                    : "Supprimer définitivement le compte"
                }
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Supprimer le compte
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription className="pt-2 text-muted-foreground">
              Cette action est <strong className="text-destructive">irréversible</strong>. Le compte de{" "}
              <strong className="text-foreground">{selected?.name}</strong> ({selected?.email}) ainsi que toutes ses données liées (favoris, lieux, événements, sessions actives) seront définitivement effacés.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)} disabled={actionLoading}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={actionLoading}>
              <Trash2 className="w-4 h-4 mr-1" />
              {actionLoading ? "Suppression..." : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
