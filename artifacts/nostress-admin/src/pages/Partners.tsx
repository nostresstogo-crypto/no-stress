import React, { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { api, type Partner } from "@/lib/api";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ExternalLink,
  Phone,
  MapPin,
  Building2,
  Mail,
  Calendar,
  AlertTriangle,
  Trash2,
  KeyRound,
  CalendarClock,
  CalendarPlus,
  RefreshCw,
} from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: {
    label: "En attente",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  approved: {
    label: "Approuvé",
    color: "text-green-400",
    bg: "bg-green-400/10",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  rejected: {
    label: "Rejeté",
    color: "text-destructive",
    bg: "bg-destructive/10",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

const BUSINESS_TYPES: Record<string, string> = {
  nightclub: "Boîte de nuit",
  festival: "Festival",
  bar: "Bar / Lounge",
  concert: "Salle de concert",
  other: "Autre",
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] || STATUS_LABELS.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.color}`}>
      {s.icon}
      {s.label}
    </span>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} à ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateShort(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function SubscriptionBadge({ partner }: { partner: Partner }) {
  if (partner.status !== "approved") {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const until = partner.subscription?.subscriptionUntil ?? partner.subscriptionUntil ?? null;
  const active = partner.subscription?.active ?? (until ? new Date(until).getTime() > Date.now() : false);
  const days = partner.subscription?.daysRemaining ?? (until ? Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / 86_400_000)) : 0);
  if (!until) return <span className="text-xs text-muted-foreground">Aucun</span>;
  const cls = !active
    ? "text-destructive bg-destructive/10"
    : days <= 14
      ? "text-yellow-400 bg-yellow-400/10"
      : "text-green-400 bg-green-400/10";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${cls}`} title={`Expire le ${formatDateShort(until)}`}>
      <CalendarClock className="w-3 h-3" />
      {active ? `${days} j` : "Expiré"}
    </span>
  );
}

export default function Partners() {
  const { admin } = useAuth();
  const isSuperAdmin = admin?.role === "superadmin";
  const [location] = useLocation();
  const urlStatus = new URLSearchParams(location.split("?")[1] || "").get("status") || "";

  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState(urlStatus);
  const [selected, setSelected] = useState<Partner | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [deletePartnerOpen, setDeletePartnerOpen] = useState(false);
  const [deletePartnerReason, setDeletePartnerReason] = useState("");
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendMonths, setExtendMonths] = useState<1 | 2 | 3 | 6>(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadPartners = useCallback(() => {
    setIsLoading(true);
    api.partners.list().then(setPartners).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { loadPartners(); }, [loadPartners]);

  const filtered = partners.filter((p) => {
    const matchStatus = !filterStatus || p.status === filterStatus;
    const matchSearch =
      !search ||
      p.businessName.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleApprove = async (partner: Partner) => {
    setActionLoading(true);
    try {
      const result = await api.partners.approve(partner.id);
      if (result?.emailError) {
        showToast(
          `${partner.businessName} approuvé, mais l'email d'identifiants n'a pas pu être envoyé. Cliquez sur "Renvoyer les identifiants".`,
          "error",
        );
      } else {
        showToast(`${partner.businessName} a été approuvé. Email d'identifiants envoyé.`);
      }
      loadPartners();
      setDetailOpen(false);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendCredentials = async (partner: Partner) => {
    if (!confirm(`Régénérer un nouveau mot de passe pour ${partner.businessName} et l'envoyer par email ? Cela invalidera les anciens accès.`)) return;
    setActionLoading(true);
    try {
      await api.partners.resendCredentials(partner.id);
      showToast(`Nouveaux identifiants envoyés à ${partner.email}.`);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await api.partners.reject(selected.id, rejectReason);
      showToast(`${selected.businessName} a été rejeté.`);
      loadPartners();
      setRejectOpen(false);
      setDetailOpen(false);
      setRejectReason("");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendSubscription = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await api.partners.extendSubscription(selected.id, extendMonths);
      showToast(res.message);
      setExtendOpen(false);
      setSelected(res.partner);
      loadPartners();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePartner = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await api.partners.delete(selected.id, deletePartnerReason || "Compte jugé frauduleux ou non conforme.");
      showToast(`Compte "${selected.businessName}" supprimé. Email d'avertissement envoyé.`);
      loadPartners();
      setDeletePartnerOpen(false);
      setDetailOpen(false);
      setDeletePartnerReason("");
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
            className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
              toast.type === "success"
                ? "bg-green-500/20 border border-green-500/40 text-green-300"
                : "bg-destructive/20 border border-destructive/40 text-destructive"
            }`}
          >
            {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {toast.msg}
          </div>
        )}

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestion des partenaires</h1>
            <p className="text-muted-foreground mt-1">Valider et gérer les inscriptions des partenaires</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadPartners} disabled={isLoading} className="flex-shrink-0 gap-2">
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, email, ville..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <div className="flex gap-2">
            {["", "pending", "approved", "rejected"].map((s) => (
              <Button
                key={s}
                variant={filterStatus === s ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(s)}
                className={filterStatus === s ? "" : "text-muted-foreground"}
              >
                {s === "" ? "Tous" : STATUS_LABELS[s]?.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun partenaire trouvé.</p>
            </div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Partenaire</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Ville</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Abonnement</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Inscrit le</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((partner) => (
                  <tr key={partner.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground text-sm">{partner.businessName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{partner.contactName} · {partner.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">{BUSINESS_TYPES[partner.businessType] || partner.businessType}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">{partner.city}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={partner.status} />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <SubscriptionBadge partner={partner} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">{formatDate(partner.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {partner.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-400 border-green-400/30 hover:bg-green-400/10 h-7 text-xs"
                              onClick={() => { setSelected(partner); handleApprove(partner); }}
                              disabled={actionLoading}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive/30 hover:bg-destructive/10 h-7 text-xs"
                              onClick={() => { setSelected(partner); setRejectOpen(true); }}
                              disabled={actionLoading}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Rejeter
                            </Button>
                          </>
                        )}
                        {isSuperAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 h-7 text-xs gap-1"
                            onClick={() => { setSelected(partner); setDeletePartnerOpen(true); }}
                          >
                            <Trash2 className="w-3 h-3" />
                            Supprimer
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => { setSelected(partner); setDetailOpen(true); }}
                        >
                          Détails
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {selected?.businessName}
            </DialogTitle>
            <DialogDescription>
              <StatusBadge status={selected?.status ?? "pending"} />
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm text-foreground">{selected.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Téléphone</p>
                    <p className="text-sm text-foreground">{selected.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ville</p>
                    <p className="text-sm text-foreground">{selected.city}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="text-sm text-foreground">{BUSINESS_TYPES[selected.businessType] || selected.businessType}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <p className="text-sm text-foreground">{selected.contactName}</p>
                  </div>
                </div>
                {selected.websiteUrl && (
                  <div className="flex items-start gap-2">
                    <ExternalLink className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Site web</p>
                      <a href={selected.websiteUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                        {selected.websiteUrl}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {selected.status === "approved" && (
                <div className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Abonnement (3 mois gratuits depuis l'approbation)</p>
                    <p className="text-sm text-foreground">
                      {(() => {
                        const until = selected.subscription?.subscriptionUntil || selected.subscriptionUntil || null;
                        const start = selected.subscription?.subscriptionStart || null;
                        if (!until) return "Aucun abonnement actif";
                        if (start) return `Du ${formatDateShort(start)} au ${formatDateShort(until)}`;
                        return `Expire le ${formatDateShort(until)}`;
                      })()}
                    </p>
                  </div>
                  <SubscriptionBadge partner={selected} />
                </div>
              )}

              {selected.description && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-foreground">{selected.description}</p>
                </div>
              )}

              {selected.status === "rejected" && selected.rejectionReason && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-xs text-destructive font-medium mb-1 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Motif de rejet
                  </p>
                  <p className="text-sm text-muted-foreground">{selected.rejectionReason}</p>
                </div>
              )}
            </div>
          )}

          {selected?.status === "pending" && (
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => { setDetailOpen(false); setRejectOpen(true); }}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Rejeter
              </Button>
              <Button
                className="bg-green-500 hover:bg-green-600 text-white"
                onClick={() => selected && handleApprove(selected)}
                disabled={actionLoading}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approuver
              </Button>
            </DialogFooter>
          )}

          {selected?.status === "approved" && (
            <DialogFooter className="gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => selected && handleResendCredentials(selected)}
                disabled={actionLoading}
              >
                <KeyRound className="w-4 h-4 mr-1" />
                Renvoyer les identifiants
              </Button>
              {isSuperAdmin && (
                <Button
                  variant="outline"
                  className="text-primary border-primary/30 hover:bg-primary/10"
                  onClick={() => { setExtendMonths(1); setExtendOpen(true); }}
                  disabled={actionLoading}
                >
                  <CalendarPlus className="w-4 h-4 mr-1" />
                  Étendre l'abonnement
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              Rejeter la demande
            </DialogTitle>
            <DialogDescription>
              Rejeter l'inscription de <strong>{selected?.businessName}</strong>. Le partenaire sera notifié par email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="reject-reason">Motif du rejet (recommandé)</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Expliquez pourquoi la demande est rejetée..."
                rows={3}
                className="bg-background mt-1.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading}
            >
              {actionLoading ? "En cours..." : "Confirmer le rejet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deletePartnerOpen} onOpenChange={setDeletePartnerOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Supprimer le compte partenaire
            </DialogTitle>
            <DialogDescription>
              Supprimer définitivement le compte de <strong>{selected?.businessName}</strong> et toutes ses publications. Un email d'avertissement sera envoyé automatiquement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">
                Cette action est irréversible. Toutes les publications du partenaire seront supprimées.
              </p>
            </div>
            <div>
              <Label htmlFor="delete-partner-reason">Motif de la suppression</Label>
              <Textarea
                id="delete-partner-reason"
                value={deletePartnerReason}
                onChange={(e) => setDeletePartnerReason(e.target.value)}
                placeholder="Ex: Compte frauduleux, contenu illicite, usurpation d'identité..."
                rows={3}
                className="bg-background mt-1.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeletePartnerOpen(false); setDeletePartnerReason(""); }}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePartner}
              disabled={actionLoading}
            >
              {actionLoading ? "Suppression..." : "Supprimer le compte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={extendOpen} onOpenChange={(o) => { setExtendOpen(o); }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <CalendarPlus className="w-5 h-5" />
              Étendre l'abonnement
            </DialogTitle>
            <DialogDescription>
              Prolonger l'abonnement de <strong>{selected?.businessName}</strong>.
              {(() => {
                const until = selected?.subscription?.subscriptionUntil || selected?.subscriptionUntil || null;
                if (!until) return null;
                const active = new Date(until).getTime() > Date.now();
                return (
                  <span className="block mt-1">
                    {active
                      ? `L'abonnement actuel expire le ${formatDateShort(until)}. L'extension partira de cette date.`
                      : `L'abonnement a expiré le ${formatDateShort(until)}. L'extension partira d'aujourd'hui.`}
                  </span>
                );
              })()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Durée de l'extension</p>
            <div className="grid grid-cols-4 gap-2">
              {([1, 2, 3, 6] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setExtendMonths(m)}
                  className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border text-sm font-semibold transition-all ${
                    extendMonths === m
                      ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                      : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  <span className="text-lg font-bold">{m}</span>
                  <span className="text-[10px] font-normal opacity-80 mt-0.5">mois</span>
                </button>
              ))}
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <p className="text-xs text-primary/80">
                L'abonnement sera prolongé de <strong>{extendMonths} mois</strong> à compter de{" "}
                <strong>
                  {(() => {
                    const until = selected?.subscription?.subscriptionUntil || selected?.subscriptionUntil || null;
                    const base = until && new Date(until).getTime() > Date.now() ? new Date(until) : new Date();
                    const end = new Date(base);
                    end.setMonth(end.getMonth() + extendMonths);
                    return end.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
                  })()}
                </strong>.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendOpen(false)}>
              Annuler
            </Button>
            <Button
              className="gap-2"
              onClick={handleExtendSubscription}
              disabled={actionLoading}
            >
              <CalendarPlus className="w-4 h-4" />
              {actionLoading ? "Extension en cours..." : `Étendre de ${extendMonths} mois`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
