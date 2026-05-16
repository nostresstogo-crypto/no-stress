import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { api, type AdminReview } from "@/lib/api";
import {
  Star,
  CheckCircle,
  XCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User,
  Building2,
  MapPin,
  Calendar,
  Mail,
  Phone,
  Clock,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useLocation } from "wouter";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{rating}/5</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-green-500/15 text-green-400 border-green-500/30">Approuvé</Badge>;
  if (status === "pending") return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">En attente</Badge>;
  if (status === "rejected") return <Badge className="bg-red-500/15 text-red-400 border-red-500/30">Rejeté</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

function AccountStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  if (status === "active") return <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-xs">Actif</Badge>;
  if (status === "suspended") return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs">Suspendu</Badge>;
  if (status === "banned") return <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-xs">Banni</Badge>;
  if (status === "approved") return <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-xs">Approuvé</Badge>;
  if (status === "pending") return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs">En attente</Badge>;
  return <Badge variant="secondary" className="text-xs">{status}</Badge>;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm text-foreground break-all">{value}</p>
      </div>
    </div>
  );
}

type AuthorDetail = {
  type: "user" | "partner";
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  createdAt: string | null;
  businessName: string | null;
};

type ItemDetail = {
  type: "event" | "venue";
  id: string;
  title: string | null;
  city: string | null;
  date: string | null;
  status: string | null;
  imageUrl: string | null;
  venueType: string | null;
};

function AuthorDialog({
  author,
  onClose,
  onNavigate,
}: {
  author: AuthorDetail | null;
  onClose: () => void;
  onNavigate: () => void;
}) {
  if (!author) return null;
  const isPartner = author.type === "partner";
  return (
    <Dialog open={!!author} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPartner ? (
              <Building2 className="w-4 h-4 text-purple-400" />
            ) : (
              <User className="w-4 h-4 text-blue-400" />
            )}
            {isPartner ? "Partenaire" : "Utilisateur"}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-1">
          <div className="flex items-center gap-3 pb-4 mb-2 border-b border-border/50">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${isPartner ? "bg-purple-500/15 text-purple-400" : "bg-blue-500/15 text-blue-400"}`}>
              {(author.name || "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground leading-tight">{author.name || "—"}</p>
              {isPartner && author.businessName && (
                <p className="text-xs text-muted-foreground mt-0.5">{author.businessName}</p>
              )}
              <div className="mt-1">
                <AccountStatusBadge status={author.status} />
              </div>
            </div>
          </div>

          <div className="space-y-0">
            <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={author.email} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Téléphone" value={author.phone} />
            <InfoRow
              icon={<Clock className="w-4 h-4" />}
              label="Inscription"
              value={author.createdAt ? format(new Date(author.createdAt), "dd MMMM yyyy", { locale: fr }) : null}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4"
            onClick={() => { onClose(); onNavigate(); }}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-2" />
            Voir dans {isPartner ? "Partenaires" : "Utilisateurs"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ItemDialog({
  item,
  onClose,
  onNavigate,
}: {
  item: ItemDetail | null;
  onClose: () => void;
  onNavigate: () => void;
}) {
  if (!item) return null;
  const isEvent = item.type === "event";
  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEvent ? (
              <Calendar className="w-4 h-4 text-indigo-400" />
            ) : (
              <MapPin className="w-4 h-4 text-teal-400" />
            )}
            {isEvent ? "Événement" : "Lieu"}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-1">
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt={item.title || ""}
              className="w-full h-36 object-cover rounded-lg mb-4"
            />
          )}

          <div className="flex items-start gap-3 pb-4 mb-2 border-b border-border/50">
            {!item.imageUrl && (
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${isEvent ? "bg-indigo-500/15 text-indigo-400" : "bg-teal-500/15 text-teal-400"}`}>
                {isEvent ? <Calendar className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground leading-tight">{item.title || "—"}</p>
              {item.venueType && (
                <p className="text-xs text-muted-foreground mt-0.5">{item.venueType}</p>
              )}
              <div className="mt-1 flex items-center gap-2">
                <AccountStatusBadge status={item.status} />
              </div>
            </div>
          </div>

          <div className="space-y-0">
            <InfoRow icon={<MapPin className="w-4 h-4" />} label="Ville" value={item.city} />
            {isEvent && item.date && (
              <InfoRow icon={<Calendar className="w-4 h-4" />} label="Date" value={item.date} />
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4"
            onClick={() => { onClose(); onNavigate(); }}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-2" />
            Voir dans {isEvent ? "Publications" : "Lieux"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Reviews() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [statusFilter, setStatusFilter] = useState("pending");
  const [itemTypeFilter, setItemTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 50;
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [selectedAuthor, setSelectedAuthor] = useState<AuthorDetail | null>(null);
  const [selectedItem, setSelectedItem] = useState<ItemDetail | null>(null);

  const params: Record<string, string> = { page: String(page), limit: String(limit) };
  if (statusFilter !== "all") params.status = statusFilter;
  if (itemTypeFilter !== "all") params.itemType = itemTypeFilter;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews", params],
    queryFn: () => api.reviews.list(params),
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.reviews.approve(id),
    onSuccess: () => {
      toast({ title: "Avis approuvé." });
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.reviews.reject(id),
    onSuccess: () => {
      toast({ title: "Avis rejeté." });
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.reviews.delete(id),
    onSuccess: () => {
      toast({ title: "Avis supprimé." });
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const openAuthor = (review: AdminReview) => {
    setSelectedAuthor({
      type: review.userId ? "user" : "partner",
      id: (review.userId ?? review.partnerId) as string,
      name: review.authorName,
      email: review.authorEmail,
      phone: review.authorPhone,
      status: review.authorStatus,
      createdAt: review.authorCreatedAt,
      businessName: review.authorBusinessName,
    });
  };

  const openItem = (review: AdminReview) => {
    setSelectedItem({
      type: review.itemType as "event" | "venue",
      id: review.itemId,
      title: review.itemTitle,
      city: review.itemCity,
      date: review.itemDate,
      status: review.itemStatus,
      imageUrl: review.itemImageUrl,
      venueType: review.itemVenueType,
    });
  };

  const formatItemType = (t: string) => (t === "event" ? "Événement" : "Lieu");

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Avis & Notes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Modérez les avis soumis par les utilisateurs avant leur publication.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="approved">Approuvés</SelectItem>
              <SelectItem value="rejected">Rejetés</SelectItem>
            </SelectContent>
          </Select>
          <Select value={itemTypeFilter} onValueChange={(v) => { setItemTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="event">Événements</SelectItem>
              <SelectItem value="venue">Lieux</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {data && (
          <p className="text-sm text-muted-foreground">
            {data.total} avis trouvé{data.total > 1 ? "s" : ""}
          </p>
        )}

        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Auteur</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cible</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Note</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Commentaire</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : !data?.reviews?.length ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      Aucun avis trouvé.
                    </td>
                  </tr>
                ) : (
                  data.reviews.map((review) => (
                    <tr key={review.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      {/* Author */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openAuthor(review)}
                          className="flex items-center gap-1.5 group text-left"
                        >
                          {review.userId ? (
                            <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          )}
                          <span className="text-sm font-medium text-foreground group-hover:underline leading-tight">
                            {review.authorName ?? (review.userId ? `Utilisateur #${review.userId}` : `Partenaire #${review.partnerId}`)}
                          </span>
                        </button>
                        {review.authorBusinessName && (
                          <p className="text-xs text-muted-foreground mt-0.5 pl-5">{review.authorBusinessName}</p>
                        )}
                      </td>

                      {/* Item */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openItem(review)}
                          className="flex flex-col items-start group text-left"
                        >
                          <span className="text-xs text-muted-foreground">
                            {formatItemType(review.itemType)}
                          </span>
                          <span className="text-sm font-medium text-foreground group-hover:underline leading-tight">
                            {review.itemTitle ?? `#${review.itemId}`}
                          </span>
                          {review.itemCity && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5">
                              <MapPin className="w-2.5 h-2.5" />
                              {review.itemCity}
                            </span>
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-3">
                        <StarRating rating={review.rating} />
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        {review.comment ? (
                          <p className="text-sm text-foreground line-clamp-2" title={review.comment}>
                            {review.comment}
                          </p>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Sans commentaire</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={review.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {format(new Date(review.createdAt), "dd/MM/yy HH:mm", { locale: fr })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {review.status !== "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-400 border-green-500/30 hover:bg-green-500/10 h-7 px-2"
                              disabled={approveMutation.isPending}
                              onClick={() => approveMutation.mutate(review.id)}
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              Approuver
                            </Button>
                          )}
                          {review.status !== "rejected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10 h-7 px-2"
                              disabled={rejectMutation.isPending}
                              onClick={() => rejectMutation.mutate(review.id)}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Rejeter
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-400 border-red-500/30 hover:bg-red-500/10 h-7 w-7 p-0"
                            onClick={() => setDeleteId(review.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Author detail dialog */}
      <AuthorDialog
        author={selectedAuthor}
        onClose={() => setSelectedAuthor(null)}
        onNavigate={() => setLocation(selectedAuthor?.type === "partner" ? "/partners" : "/users")}
      />

      {/* Item detail dialog */}
      <ItemDialog
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onNavigate={() => setLocation(selectedItem?.type === "event" ? "/publications" : "/venues")}
      />

      {/* Delete confirm dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'avis ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'avis sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
