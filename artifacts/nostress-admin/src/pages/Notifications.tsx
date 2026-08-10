import React, { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Bell, BellOff, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PartnerNotification {
  id: number;
  partnerId: number;
  partnerName: string;
  partnerEmail: string;
  type: string;
  titleFr: string;
  bodyFr: string;
  pushSent: number;
  readAt: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  account_approved: "Compte approuvé",
  account_rejected: "Compte rejeté",
  event_deleted: "Événement supprimé",
  subscription_extended: "Abonnement prolongé",
  password_changed: "Mot de passe modifié",
};

const TYPE_COLORS: Record<string, string> = {
  account_approved: "text-green-400 bg-green-400/10",
  account_rejected: "text-red-400 bg-red-400/10",
  event_deleted: "text-orange-400 bg-orange-400/10",
  subscription_extended: "text-blue-400 bg-blue-400/10",
  password_changed: "text-purple-400 bg-purple-400/10",
};

export default function NotificationsPage() {
  const { admin } = useAuth();
  const [notifications, setNotifications] = useState<PartnerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "missed">("missed");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.notifications.partnerNotifications(filter === "missed");
      setNotifications(data.notifications ?? []);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const filtered = notifications.filter((n) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      n.partnerName.toLowerCase().includes(q) ||
      n.partnerEmail.toLowerCase().includes(q) ||
      n.titleFr.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              Notifications partenaires
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Historique des notifications critiques envoyées aux partenaires. Les notifications sans push token sont signalées.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["missed", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {f === "missed" ? "Sans push token" : "Toutes"}
              </button>
            ))}
          </div>
          <Input
            placeholder="Rechercher partenaire, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Stats */}
        {!loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Affichées", value: filtered.length, icon: Bell, color: "text-primary" },
              { label: "Sans push", value: notifications.filter((n) => n.pushSent === 0).length, icon: BellOff, color: "text-orange-400" },
              { label: "Avec push", value: notifications.filter((n) => n.pushSent > 0).length, icon: CheckCircle2, color: "text-green-400" },
              { label: "Non lues", value: notifications.filter((n) => !n.readAt).length, icon: Bell, color: "text-blue-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <Icon className={`w-5 h-5 ${color}`} />
                <div>
                  <div className="text-xl font-bold">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Chargement…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <BellOff className="w-10 h-10 opacity-30" />
              <p className="text-sm">{filter === "missed" ? "Aucune notification sans push token." : "Aucune notification."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Partenaire</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Message</th>
                    <th className="px-4 py-3 text-center">Push</th>
                    <th className="px-4 py-3 text-center">Lu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((n) => (
                    <tr key={n.id} className={`hover:bg-muted/30 transition-colors ${n.pushSent === 0 ? "bg-orange-500/5" : ""}`}>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                        {format(new Date(n.createdAt), "dd MMM yyyy HH:mm", { locale: fr })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{n.partnerName}</div>
                        <div className="text-xs text-muted-foreground">{n.partnerEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[n.type] ?? "text-muted-foreground bg-muted"}`}>
                          {TYPE_LABELS[n.type] ?? n.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-medium truncate">{n.titleFr}</div>
                        <div className="text-xs text-muted-foreground truncate">{n.bodyFr}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {n.pushSent > 0 ? (
                          <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {n.pushSent}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-orange-400 text-xs font-medium">
                            <BellOff className="w-3.5 h-3.5" />
                            Non envoyé
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {n.readAt ? (
                          <span className="text-xs text-green-400">
                            {format(new Date(n.readAt), "dd MMM", { locale: fr })}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
