import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api, type AdminUser } from "@/lib/api";
import { Search, UserX, Ban, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type ActionType = "suspend" | "ban" | "reactivate" | null;

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge className="bg-green-500/15 text-green-400 border-green-500/30">Actif</Badge>;
  if (status === "suspended") return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">Suspendu</Badge>;
  if (status === "banned") return <Badge className="bg-red-500/15 text-red-400 border-red-500/30">Banni</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

export default function Users() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { admin } = useAuth();
  const isSuperAdmin = admin?.role === "superadmin";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 50;

  const [actionUser, setActionUser] = useState<AdminUser | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [reason, setReason] = useState("");
  const [untilDate, setUntilDate] = useState("");

  const params: Record<string, string> = { page: String(page), limit: String(limit) };
  if (search.trim()) params.search = search.trim();
  if (statusFilter !== "all") params.status = statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", params],
    queryFn: () => api.users.list(params),
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  const openAction = useCallback((user: AdminUser, type: ActionType) => {
    setActionUser(user);
    setActionType(type);
    setReason("");
    setUntilDate("");
  }, []);

  const closeAction = useCallback(() => {
    setActionUser(null);
    setActionType(null);
  }, []);

  const mutate = useMutation({
    mutationFn: async () => {
      if (!actionUser) return undefined;
      if (actionType === "suspend") return api.users.suspend(actionUser.id, reason, untilDate || undefined);
      if (actionType === "ban") return api.users.ban(actionUser.id, reason);
      if (actionType === "reactivate") return api.users.reactivate(actionUser.id);
      return undefined;
    },
    onSuccess: () => {
      const msgs: Record<string, string> = {
        suspend: "Utilisateur suspendu.",
        ban: "Utilisateur banni.",
        reactivate: "Compte réactivé.",
      };
      toast({ title: msgs[actionType!] || "Action effectuée." });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      closeAction();
    },
    onError: (e: any) => {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    },
  });

  const canSubmit =
    actionType === "reactivate" || (reason.trim().length >= 5);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Utilisateurs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gérer les comptes utilisateurs — suspension, bannissement, réactivation.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou email…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="suspended">Suspendus</SelectItem>
              <SelectItem value="banned">Bannis</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats row */}
        {data && (
          <p className="text-sm text-muted-foreground">
            {data.total} utilisateur{data.total > 1 ? "s" : ""} trouvé{data.total > 1 ? "s" : ""}
          </p>
        )}

        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Utilisateur</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Inscription</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : !data?.users?.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                ) : (
                  data.users.map((user) => (
                    <tr key={user.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {[user.firstName, user.name].filter(Boolean).join(" ") || "—"}
                        </p>
                        {user.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <StatusBadge status={user.status} />
                          {user.statusReason && (
                            <p className="text-xs text-muted-foreground max-w-[200px] truncate" title={user.statusReason}>
                              {user.statusReason}
                            </p>
                          )}
                          {user.statusUntil && (
                            <p className="text-xs text-amber-400">
                              Jusqu'au {format(new Date(user.statusUntil), "dd/MM/yyyy", { locale: fr })}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: fr })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {isSuperAdmin && user.status !== "active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-400 border-green-500/30 hover:bg-green-500/10 h-7 px-2"
                              onClick={() => openAction(user, "reactivate")}
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              Réactiver
                            </Button>
                          )}
                          {isSuperAdmin && user.status !== "suspended" && user.status !== "banned" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10 h-7 px-2"
                              onClick={() => openAction(user, "suspend")}
                            >
                              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                              Suspendre
                            </Button>
                          )}
                          {isSuperAdmin && user.status !== "banned" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-400 border-red-500/30 hover:bg-red-500/10 h-7 px-2"
                              onClick={() => openAction(user, "ban")}
                            >
                              <Ban className="w-3.5 h-3.5 mr-1" />
                              Bannir
                            </Button>
                          )}
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

      {/* Action Modal */}
      <Dialog open={!!actionType} onOpenChange={(open) => !open && closeAction()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "suspend" && <><AlertTriangle className="w-5 h-5 text-amber-400" /> Suspendre l'utilisateur</>}
              {actionType === "ban" && <><Ban className="w-5 h-5 text-red-400" /> Bannir l'utilisateur</>}
              {actionType === "reactivate" && <><CheckCircle className="w-5 h-5 text-green-400" /> Réactiver le compte</>}
            </DialogTitle>
          </DialogHeader>

          {actionUser && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Utilisateur : <strong className="text-foreground">{actionUser.email}</strong>
              </p>

              {actionType === "reactivate" ? (
                <p className="text-sm text-muted-foreground">
                  Le compte sera remis en état <strong className="text-green-400">actif</strong> et un email de confirmation sera envoyé.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="reason">
                      Motif <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="reason"
                      placeholder="Expliquez la raison de cette action…"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">Ce motif sera inclus dans l'email envoyé à l'utilisateur.</p>
                  </div>

                  {actionType === "suspend" && (
                    <div className="space-y-2">
                      <Label htmlFor="until">Date de fin de suspension (optionnel)</Label>
                      <Input
                        id="until"
                        type="date"
                        value={untilDate}
                        onChange={(e) => setUntilDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  )}

                  {actionType === "ban" && (
                    <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2">
                      <p className="text-xs text-red-400">
                        Le bannissement est <strong>définitif</strong>. L'utilisateur ne pourra plus se connecter.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeAction} disabled={mutate.isPending}>
              Annuler
            </Button>
            <Button
              onClick={() => mutate.mutate()}
              disabled={mutate.isPending || !canSubmit}
              className={
                actionType === "ban"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : actionType === "suspend"
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }
            >
              {mutate.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                actionType === "reactivate" ? "Réactiver" : actionType === "ban" ? "Bannir" : "Suspendre"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
