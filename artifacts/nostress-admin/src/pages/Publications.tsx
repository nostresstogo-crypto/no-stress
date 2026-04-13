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
  Clock,
  AlertTriangle,
  MapPin,
  Calendar,
  Euro,
  MessageSquare,
  Copy,
} from "lucide-react";

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

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "En attente", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  approved: { label: "Approuvée", color: "text-green-400", bg: "bg-green-400/10" },
  rejected: { label: "Rejetée", color: "text-destructive", bg: "bg-destructive/10" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function Publications() {
  const [events, setEvents] = useState<PartnerEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PartnerEvent | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
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

  const filtered = events.filter((e) =>
    !search ||
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.partnerName.toLowerCase().includes(search.toLowerCase()) ||
    e.city.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!selected) return;
    setDeleteLoading(true);
    try {
      const result = await api.publications.delete(selected.id);
      setNotifMsg(result.notification);
      setDeleteOpen(false);
      setNotifOpen(true);
      load();
      showToast(`Publication "${selected.title}" supprimée.`);
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
      <div className="p-8">
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

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Gestion des publications</h1>
          <p className="text-muted-foreground mt-1">Modérer les événements publiés par les partenaires</p>
        </div>

        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par titre, partenaire, ville..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
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
            <table className="w-full">
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
                {filtered.map((ev) => {
                  const st = STATUS_STYLES[ev.status] || STATUS_STYLES.pending;
                  return (
                    <tr key={ev.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground text-sm">{ev.title}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {ev.date}
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
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">{ev.partnerName}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">{CATEGORY_LABELS[ev.category] || ev.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${st.bg} ${st.color}`}>
                          {ev.status === "pending" ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10 h-7 text-xs gap-1"
                          onClick={() => { setSelected(ev); setDeleteOpen(true); }}
                        >
                          <Trash2 className="w-3 h-3" />
                          Supprimer
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
              Cette action est irréversible. La publication sera supprimée et le partenaire sera notifié automatiquement.
            </p>
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
