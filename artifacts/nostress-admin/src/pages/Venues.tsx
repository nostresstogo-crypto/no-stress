import React, { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { api, type Venue } from "@/lib/api";
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
  MapPin,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Globe,
  Phone,
  RefreshCw,
  Info,
  ImageOff,
  CalendarDays,
  User,
} from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: "En attente", color: "text-yellow-400", bg: "bg-yellow-400/10", icon: <Clock className="w-3 h-3" /> },
  approved: { label: "Approuvé", color: "text-green-400", bg: "bg-green-400/10", icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { label: "Rejeté", color: "text-destructive", bg: "bg-destructive/10", icon: <XCircle className="w-3 h-3" /> },
};

const TYPE_LABELS: Record<string, string> = {
  bar: "Bar",
  restaurant: "Restaurant",
  nightclub: "Boîte de nuit",
  concertHall: "Salle de concert",
  beachClub: "Beach Club",
  cinema: "Cinéma",
  cultural: "Lieu culturel",
  other: "Autre",
};

export default function Venues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selected, setSelected] = useState<Venue | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [detailVenue, setDetailVenue] = useState<Venue | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(() => {
    setIsLoading(true);
    api.venues
      .list()
      .then((r) => setVenues(r.venues))
      .catch((e) => showToast(e.message, "error"))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = venues.filter((v) => {
    const q = search.toLowerCase();
    const searchOk = !search ||
      (v.name ?? "").toLowerCase().includes(q) ||
      (v.city ?? "").toLowerCase().includes(q) ||
      (v.address ?? "").toLowerCase().includes(q);
    const statusOk = statusFilter === "all" || v.status === statusFilter;
    return searchOk && statusOk;
  });

  const counts = {
    all: venues.length,
    pending: venues.filter((v) => v.status === "pending").length,
    approved: venues.filter((v) => v.status === "approved").length,
    rejected: venues.filter((v) => v.status === "rejected").length,
  };

  const handleApprove = async (v: Venue) => {
    setActionLoading(v.id);
    try {
      await api.venues.approve(v.id);
      showToast(`"${v.name}" approuvé.`);
      load();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const openReject = (v: Venue) => {
    setSelected(v);
    setRejectReason(v.rejectionReason || "");
    setRejectOpen(true);
  };

  const handleReject = async () => {
    if (!selected) return;
    const trimmed = rejectReason.trim();
    if (trimmed.length < 3) {
      showToast("Le motif est requis (3 caractères minimum).", "error");
      return;
    }
    setRejectLoading(true);
    try {
      await api.venues.reject(selected.id, trimmed);
      showToast(`"${selected.name}" rejeté.`);
      setRejectOpen(false);
      setRejectReason("");
      load();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setRejectLoading(false);
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
            <h1 className="text-2xl font-bold text-foreground">Validation des lieux</h1>
            <p className="text-muted-foreground mt-1">
              Approuver ou rejeter les lieux soumis par les partenaires (les événements ne peuvent être créés que sur des lieux approuvés).
            </p>
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
              placeholder="Rechercher par nom, ville, adresse..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "approved", "rejected"] as const).map((f) => {
              const labels = { all: "Tous", pending: "En attente", approved: "Approuvés", rejected: "Rejetés" };
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
              <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun lieu trouvé.</p>
            </div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lieu</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">GPS</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((v) => {
                  const s = STATUS_LABELS[v.status] || STATUS_LABELS.pending;
                  return (
                    <tr key={v.id} className="hover:bg-muted/20 transition-colors align-top">
                      <td className="px-4 py-3">
                        <div className="flex gap-3">
                          {v.imageUrl && /^https?:\/\//i.test(v.imageUrl) && !v.imageUrl.startsWith("blob:") ? (
                            <img
                              src={v.imageUrl}
                              alt={v.name}
                              className="w-14 h-14 rounded-md object-cover bg-muted flex-shrink-0"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                // Hide broken thumbnails (e.g. expired blob: URIs from old uploads)
                                // and let the placeholder beside the image element show through.
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div
                              className="w-14 h-14 rounded-md bg-muted flex flex-col items-center justify-center flex-shrink-0"
                              title="Aucune photo"
                            >
                              <MapPin className="w-5 h-5 text-muted-foreground" />
                              <span className="text-[8px] text-muted-foreground/80 mt-0.5">Aucune photo</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-sm">{v.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span>{[v.city, v.address].filter(Boolean).join(" — ") || "—"}</span>
                            </div>
                            {v.description && (
                              <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2 max-w-md">{v.description}</p>
                            )}
                            <div className="flex flex-wrap gap-3 mt-1.5">
                              {v.phone && (
                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/80">
                                  <Phone className="w-3 h-3" />
                                  {v.phone}
                                </span>
                              )}
                              {v.websiteUrl && (
                                <a
                                  href={v.websiteUrl}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                                >
                                  <Globe className="w-3 h-3" />
                                  Site web
                                </a>
                              )}
                              {(v.partnerName || v.partnerId) && (
                                <span className="text-[11px] text-muted-foreground/70">
                                  Partenaire :{" "}
                                  <span className="text-foreground/90 font-medium">
                                    {v.partnerName || `#${v.partnerId}`}
                                  </span>
                                  {v.partnerEmail && (
                                    <span className="opacity-70"> · {v.partnerEmail}</span>
                                  )}
                                </span>
                              )}
                            </div>
                            {v.status === "rejected" && v.rejectionReason && (
                              <p className="text-[11px] text-destructive mt-1">Motif : {v.rejectionReason}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">{TYPE_LABELS[v.type || ""] || v.type || "—"}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {v.latitude != null && v.longitude != null ? (
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${v.latitude}&mlon=${v.longitude}#map=17/${v.latitude}/${v.longitude}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-xs text-primary hover:underline"
                          >
                            {v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}
                          </a>
                        ) : (
                          <span className="text-xs text-yellow-400">Non renseigné</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.color}`}>
                          {s.icon}
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => setDetailVenue(v)}
                          >
                            <Info className="w-3 h-3" />
                            Détails
                          </Button>
                          {v.status !== "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoading === v.id}
                              className="text-green-400 border-green-400/30 hover:bg-green-400/10 h-7 text-xs gap-1"
                              onClick={() => handleApprove(v)}
                            >
                              <ThumbsUp className="w-3 h-3" />
                              Approuver
                            </Button>
                          )}
                          {v.status !== "rejected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoading === v.id}
                              className="text-yellow-400 border-yellow-400/30 hover:bg-yellow-400/10 h-7 text-xs gap-1"
                              onClick={() => openReject(v)}
                            >
                              <ThumbsDown className="w-3 h-3" />
                              Rejeter
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
        </div>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-400">
              <ThumbsDown className="w-5 h-5" />
              Rejeter le lieu
            </DialogTitle>
            <DialogDescription>
              Rejeter <strong>"{selected?.name}"</strong>. Indiquez un motif pour aider le partenaire à corriger.
            </DialogDescription>
          </DialogHeader>

          <div>
            <label className="text-sm font-medium text-foreground">Motif du rejet</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex: Photos manquantes, adresse incomplète, doublon..."
              rows={3}
              className="w-full mt-1.5 px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={rejectLoading}>
              Annuler
            </Button>
            <Button onClick={handleReject} disabled={rejectLoading || rejectReason.trim().length < 3}>
              {rejectLoading ? "Envoi..." : "Confirmer le rejet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modale Détails */}
      <Dialog open={!!detailVenue} onOpenChange={(o) => { if (!o) setDetailVenue(null); }}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              {detailVenue?.name}
            </DialogTitle>
            <DialogDescription>
              Détails complets du lieu avant validation
            </DialogDescription>
          </DialogHeader>

          {detailVenue && (() => {
            const v = detailVenue;
            const s = STATUS_LABELS[v.status] || STATUS_LABELS.pending;
            const allImages = [
              ...(v.imageUrl && /^https?:\/\//i.test(v.imageUrl) ? [v.imageUrl] : []),
              ...(v.images || []).filter((img) => img !== v.imageUrl && /^https?:\/\//i.test(img)),
            ];
            return (
              <div className="space-y-5 mt-2">

                {/* Statut */}
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.color}`}>
                    {s.icon}{s.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{TYPE_LABELS[v.type || ""] || v.type || "Type inconnu"}</span>
                </div>

                {/* Photos */}
                {allImages.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Photos ({allImages.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {allImages.map((img, i) => (
                        <a key={i} href={img} target="_blank" rel="noreferrer noopener">
                          <img
                            src={img}
                            alt={`Photo ${i + 1}`}
                            className="w-28 h-20 object-cover rounded-md border border-border hover:opacity-80 transition-opacity"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageOff className="w-4 h-4" />
                    Aucune photo fournie
                  </div>
                )}

                {/* Infos principales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Localisation</p>
                    {v.city && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-muted-foreground" />{v.city}</p>}
                    {v.address && <p className="text-muted-foreground text-xs pl-5">{v.address}</p>}
                    {v.latitude != null && v.longitude != null ? (
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${v.latitude}&mlon=${v.longitude}#map=17/${v.latitude}/${v.longitude}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex items-center gap-1.5 text-primary hover:underline text-xs pl-5"
                      >
                        📍 Voir sur la carte ({v.latitude.toFixed(4)}, {v.longitude.toFixed(4)})
                      </a>
                    ) : (
                      <p className="text-xs text-yellow-400 pl-5">GPS non renseigné</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</p>
                    {v.phone ? (
                      <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-muted-foreground" />{v.phone}</p>
                    ) : <p className="text-muted-foreground text-xs">Pas de téléphone</p>}
                    {v.websiteUrl ? (
                      <a
                        href={v.websiteUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex items-center gap-1.5 text-primary hover:underline text-xs"
                      >
                        <Globe className="w-3.5 h-3.5" />{v.websiteUrl}
                      </a>
                    ) : <p className="text-muted-foreground text-xs">Pas de site web</p>}
                  </div>
                </div>

                {/* Description */}
                {v.description && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                    <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">{v.description}</p>
                  </div>
                )}

                {/* Partenaire */}
                <div className="border-t border-border pt-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Partenaire</p>
                  <p className="flex items-center gap-1.5 text-sm"><User className="w-3.5 h-3.5 text-muted-foreground" />{v.partnerName || `#${v.partnerId}`}</p>
                  {v.partnerEmail && <p className="text-xs text-muted-foreground pl-5">{v.partnerEmail}</p>}
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="w-3 h-3" />
                    Soumis le {new Date(v.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>

                {v.status === "rejected" && v.rejectionReason && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 text-sm text-destructive">
                    Motif de rejet : {v.rejectionReason}
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setDetailVenue(null)}>Fermer</Button>
            {detailVenue?.status !== "approved" && (
              <Button
                className="text-green-400 border-green-400/30 hover:bg-green-400/10"
                variant="outline"
                onClick={() => { handleApprove(detailVenue!); setDetailVenue(null); }}
              >
                <ThumbsUp className="w-4 h-4 mr-1.5" />
                Approuver
              </Button>
            )}
            {detailVenue?.status !== "rejected" && (
              <Button
                variant="outline"
                className="text-yellow-400 border-yellow-400/30 hover:bg-yellow-400/10"
                onClick={() => { setDetailVenue(null); openReject(detailVenue!); }}
              >
                <ThumbsDown className="w-4 h-4 mr-1.5" />
                Rejeter
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
