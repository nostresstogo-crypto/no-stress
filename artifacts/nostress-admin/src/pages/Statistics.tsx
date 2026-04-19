import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { api, type RegistrationStats } from "@/lib/api";
import { Users, Building2, TrendingUp, Calendar } from "lucide-react";

type Period = "day" | "week" | "month" | "year";

const PERIOD_LABELS: Record<Period, string> = {
  day: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois",
  year: "Cette année",
};

export default function Statistics() {
  const [period, setPeriod] = useState<Period>("week");
  const [stats, setStats] = useState<RegistrationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api.registrations.stats(period).then(setStats).catch(console.error).finally(() => setIsLoading(false));
  }, [period]);

  const maxValue = stats
    ? Math.max(...stats.buckets.map((b) => b.partners + b.clients), 1)
    : 1;

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Statistiques d'inscription</h1>
            <p className="text-muted-foreground mt-1">Suivez les inscriptions partenaires et clients sur la plateforme</p>
          </div>

          <div className="flex gap-2 bg-card border border-border rounded-xl p-1">
            {(["day", "week", "month", "year"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-muted rounded w-32 mb-4" />
                <div className="h-8 bg-muted rounded w-16" />
              </div>
            ))
          ) : (
            <>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">Total inscriptions</p>
                </div>
                <p className="text-3xl font-bold text-foreground">{stats?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{PERIOD_LABELS[period]}</p>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-400/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">Clients inscrits</p>
                </div>
                <p className="text-3xl font-bold text-foreground">{stats?.clientCount ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats && stats.total > 0 ? Math.round((stats.clientCount / stats.total) * 100) : 0}% du total
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-400/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-yellow-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">Partenaires inscrits</p>
                </div>
                <p className="text-3xl font-bold text-foreground">{stats?.partnerCount ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats && stats.total > 0 ? Math.round((stats.partnerCount / stats.total) * 100) : 0}% du total
                </p>
              </div>
            </>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Évolution des inscriptions</h2>
            <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />
                Clients
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />
                Partenaires
              </span>
            </span>
          </div>

          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              Chargement du graphique...
            </div>
          ) : (
            <div className="flex items-end gap-1 h-48 overflow-x-auto pb-2">
              {stats?.buckets.map((bucket, i) => {
                const total = bucket.partners + bucket.clients;
                const pct = total / maxValue;
                const clientPct = total > 0 ? bucket.clients / total : 0;
                const partnerPct = total > 0 ? bucket.partners / total : 0;
                return (
                  <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: "32px" }}>
                    <div className="flex flex-col justify-end w-full" style={{ height: "160px" }}>
                      <div
                        className="w-full flex flex-col gap-0.5 rounded-t-sm overflow-hidden"
                        style={{ height: `${Math.max(pct * 100, total > 0 ? 4 : 0)}%` }}
                      >
                        <div
                          className="w-full bg-yellow-400"
                          style={{ height: `${partnerPct * 100}%`, minHeight: bucket.partners > 0 ? "4px" : "0" }}
                        />
                        <div
                          className="w-full bg-blue-400"
                          style={{ height: `${clientPct * 100}%`, minHeight: bucket.clients > 0 ? "4px" : "0" }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground rotate-45 origin-left" style={{ fontSize: "9px" }}>
                      {bucket.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {stats && (
          <div className="mt-6 bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4">Répartition</h2>
            <div className="space-y-3">
              {[
                { label: "Clients", value: stats.clientCount, color: "bg-blue-400" },
                { label: "Partenaires", value: stats.partnerCount, color: "bg-yellow-400" },
              ].map((row) => {
                const pct = stats.total > 0 ? Math.round((row.value / stats.total) * 100) : 0;
                return (
                  <div key={row.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span className="text-sm font-medium text-foreground">{row.value} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${row.color} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
