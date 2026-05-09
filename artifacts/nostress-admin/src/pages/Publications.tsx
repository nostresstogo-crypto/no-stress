import React, { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { api, type PartnerEvent } from "@/lib/api";
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
  Search,
  Trash2,
  FileText,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Calendar,
  Euro,
  MessageSquare,
  Copy,
  Clock,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
} from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: "En attente", color: "text-yellow-400", bg: "bg-yellow-400/10", icon: <Clock className="w-3 h-3" /> },
  approved: { label: "Approuvé", color: "text-green-400", bg: "bg-green-400/10", icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { label: "Rejeté", color: "text-destructive", bg: "bg-destructive/10", icon: <XCircle className="w-3 h-3" /> },
  archived: { label: "Archivé", color: "text-slate-400", bg: "bg-slate-400/10", icon: <Clock className="w-3 h-3" /> },
};

const CATEGORY_LABELS: Record<string, string> = {
  concerts: "Concert",
  nightclubs: "Boîte de nuit",
  bars: "Bar",
  restaurants: "Restaurant",
  festivals: "Festival",
  beach: "Beach Club",
  cinema: "Cinéma",
  sport: "Sport",
  culture: "Culturel",
  comedy: "Comédie",
  liveMusic: "Musique live",
};

function pad2(n: number) { return n < 10 ? `0${n}` : String(n); }
function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} à ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export default function Publications() {
  const [events, setEvents] = useState<PartnerEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "archived">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selected, setSelected] = useState<PartnerEvent | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [notifMsg, setNotifMsg] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(() => {
    setIsLoading(true);
    api.publications.list().then(setEvents).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const effectiveStatus = (e: PartnerEvent) =>
    e.status === "archived" || e.isArchived ? "archived" : e.status;

  const filtered = events.filter((e) => {
    const q = search.toLowerCase();
    const searchOk = !search ||
      (e.title ?? "").toLowerCase().includes(q) ||
      (e.partnerName ?? "").toLowerCase().includes(q) ||
      (e.city ?? "").toLowerCase().includes(q);
    const statusOk = statusFilter === "all" || effectiveStatus(e) === statusFilter;
    return searchOk && statusOk;
  });

  const counts = {
    all: events.length,
    pending: events.filter((e) => effectiveStatus(e) === "pending").length,
    approved: events.filter((e) => effectiveStatus(e) === "approved").length,
    rejected: events.filter((e) => effectiveStatus(e) === "rejected").length,
    archived: events.filter((e) => effectiveStatus(e) === "archived").length,
  };

  const handleApprove = async (ev: PartnerEvent) => {
    setActionLoading(ev.id);
    try {
      await api.publications.approve(ev.id);
      showToast(`"${ev.title}" approuvé.`);
      load();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (ev: PartnerEvent) => {
    setActionLoading(ev.id);
    try {
      await api.publications.reject(ev.id);
      showToast(`"${ev.title}" rejeté.`);
      load();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleteLoading(true);
    try {
      const result = await api.publications.delete(selected.id, deleteReason || undefined);
      setNotifMsg(result.notification);
      setDeleteOpen(false);
      setDeleteReason("");
      setNotifOpen(true);
      load();
      showToast(`Publication "${selected.title}" supprimée. Avertissement envoyé au partenaire.`);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCopy = () => {
    if (notifMsg) {
      navigator.clipboard.writeText(notifMsg);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
            <h1 className="text-2xl font-bold text-foreground">Gestion des publications</h1>
            <p className="text-muted-foreground mt-1">Surveiller et supprimer les publications non conformes à nos conditions</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={isLoading} className="flex-shrink-0 gap-2">
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par titre, partenaire, ville..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "approved", "rejected", "archived"] as const).map((f) => {
              const labels = { all: "Tous", pending: "En attente", approved: "Approuvés", rejected: "Rejetés", archived: "Archivés" };
              const active = statusFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:bg-muted/30"
                  }`}
                >
                  {labels[f]} <span className="opacity-70">({counts[f]})</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Aucune publication trouvée.</p>
            </div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Publication</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Partenaire</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Catégorie</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((ev) => (
                    <tr key={ev.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground text-sm">{ev.title}</p>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {formatDate(ev.date)}{ev.time ? ` à ${ev.time}` : ""}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              {ev.city}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Euro className="w-3 h-3" />
                              {ev.isFree ? "Gratuit" : `${ev.priceFCFA.toLocaleString()} FCFA`}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground/70 mt-1">
                            Posté le {formatDateTime(ev.createdAt)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">{ev.partnerName}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">{CATEGORY_LABELS[ev.category] || ev.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const es = effectiveStatus(ev);
                          const s = STATUS_LABELS[es] || STATUS_LABELS.pending;
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.color}`}>
                              {s.icon}
                              {s.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          {effectiveStatus(ev) === "archived" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoading === ev.id}
                              className="text-blue-400 border-blue-400/30 hover:bg-blue-400/10 h-7 text-xs gap-1"
                              onClick={() => handleApprove(ev)}
                            >
                              <CheckCircle className="w-3 h-3" />
                              Restaurer
                            </Button>
                          )}
                          {effectiveStatus(ev) !== "approved" && effectiveStatus(ev) !== "archived" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoading === ev.id}
                              className="text-green-400 border-green-400/30 hover:bg-green-400/10 h-7 text-xs gap-1"
                              onClick={() => handleApprove(ev)}
                            >
                              <ThumbsUp className="w-3 h-3" />
                              Approuver
                            </Button>
                          )}
                          {ev.status !== "rejected" && ev.status !== "archived" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoading === ev.id}
                              className="text-yellow-400 border-yellow-400/30 hover:bg-yellow-400/10 h-7 text-xs gap-1"
                              onClick={() => handleReject(ev)}
                            >
                              <ThumbsDown className="w-3 h-3" />
                              Rejeter
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 h-7 text-xs gap-1"
                            onClick={() => { setSelected(ev); setDeleteOpen(true); }}
                          >
                            <Trash2 className="w-3 h-3" />
                            Supprimer
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

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Supprimer la publication
            </DialogTitle>
            <DialogDescription>
              Supprimer <strong>"{selected?.title}"</strong> de <strong>{selected?.partnerName}</strong>. Un message automatique sera généré pour notifier le partenaire.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-300">
              Cette action est irréversible. La publication sera supprimée et un email d'avertissement sera envoyé automatiquement au partenaire.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Motif de la suppression (recommandé)</label>
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Ex: Contenu inapproprié, informations trompeuses, publicité interdite..."
              rows={3}
              className="w-full mt-1.5 px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteLoading}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? "Suppression..." : "Confirmer la suppression"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={notifOpen} onOpenChange={setNotifOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-400">
              <MessageSquare className="w-5 h-5" />
              Message automatique généré
            </DialogTitle>
            <DialogDescription>
              Ce message a été préparé pour être envoyé au partenaire. Copiez-le ou envoyez-le par email.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/30 rounded-lg p-4">
            <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
              {notifMsg}
            </pre>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCopy} className="gap-2">
              <Copy className="w-4 h-4" />
              {copied ? "Copié !" : "Copier le message"}
            </Button>
            <Button onClick={() => setNotifOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
