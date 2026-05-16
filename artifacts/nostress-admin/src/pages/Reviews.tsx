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
import { useToast } from "@/hooks/use-toast";
import { api, type AdminReview } from "@/lib/api";
import { Star, CheckCircle, XCircle, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

export default function Reviews() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState("pending");
  const [itemTypeFilter, setItemTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 50;
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
                      <td className="px-4 py-3 text-muted-foreground">
                        {review.userId ? (
                          <span className="text-xs bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">
                            Utilisateur #{review.userId}
                          </span>
                        ) : (
                          <span className="text-xs bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded">
                            Partenaire #{review.partnerId}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{formatItemType(review.itemType)}</span>
                        <span className="ml-1 text-xs text-foreground">#{review.itemId}</span>
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
