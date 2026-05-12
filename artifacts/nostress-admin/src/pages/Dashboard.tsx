import React, { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { api } from "@/lib/api";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  ArrowUpRight,
  TrendingUp,
  FileText,
  Sparkles,
  ShieldCheck,
  Activity,
  Bell,
  RefreshCw,
} from "lucide-react";

interface Stats {
  pendingPartners: number;
  approvedPartners: number;
  rejectedPartners: number;
  totalDeletionRequests: number;
  pendingDeletionRequests: number;
  pendingPublications: number;
  totalPublications: number;
  totalUsers: number;
}

const WEEKDAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const formatDate = (d: Date) => {
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${WEEKDAYS_FR[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export default function Dashboard() {
  const { admin } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const today = new Date();

  const loadStats = useCallback(() => {
    setLoading(true);
    api.admin
      .stats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const totalPartners = stats
    ? stats.pendingPartners + stats.approvedPartners + stats.rejectedPartners
    : 0;
  const urgentCount = stats
    ? stats.pendingPartners + stats.pendingPublications + stats.pendingDeletionRequests
    : 0;

  const kpiCards = [
    {
      title: "Partenaires en attente",
      value: stats?.pendingPartners ?? 0,
      caption: "À valider",
      icon: Clock,
      gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
      ring: "ring-amber-500/30",
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/15",
      link: "/partenaires?status=pending",
      urgent: (stats?.pendingPartners ?? 0) > 0,
    },
    {
      title: "Partenaires approuvés",
      value: stats?.approvedPartners ?? 0,
      caption: "Actifs sur la plateforme",
      icon: CheckCircle2,
      gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
      ring: "ring-emerald-500/30",
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/15",
      link: "/partenaires?status=approved",
    },
    {
      title: "Publications à modérer",
      value: stats?.pendingPublications ?? 0,
      caption: `${stats?.totalPublications ?? 0} publication(s) au total`,
      icon: FileText,
      gradient: "from-sky-500/20 via-sky-500/5 to-transparent",
      ring: "ring-sky-500/30",
      iconColor: "text-sky-400",
      iconBg: "bg-sky-500/15",
      link: "/publications",
      urgent: (stats?.pendingPublications ?? 0) > 0,
    },
    {
      title: "Demandes de suppression",
      value: stats?.pendingDeletionRequests ?? 0,
      caption: `${stats?.totalDeletionRequests ?? 0} demande(s) au total`,
      icon: Trash2,
      gradient: "from-rose-500/20 via-rose-500/5 to-transparent",
      ring: "ring-rose-500/30",
      iconColor: "text-rose-400",
      iconBg: "bg-rose-500/15",
      link: "/suppressions",
      urgent: (stats?.pendingDeletionRequests ?? 0) > 0,
    },
  ];

  const partnerBreakdown = stats
    ? [
        {
          label: "Approuvés",
          value: stats.approvedPartners,
          color: "from-emerald-400 to-emerald-500",
          dot: "bg-emerald-400",
        },
        {
          label: "En attente",
          value: stats.pendingPartners,
          color: "from-amber-400 to-amber-500",
          dot: "bg-amber-400",
        },
        {
          label: "Rejetés",
          value: stats.rejectedPartners,
          color: "from-rose-400 to-rose-500",
          dot: "bg-rose-400",
        },
      ]
    : [];

  const quickActions = [
    {
      label: "Valider les inscriptions partenaires",
      caption: "Examiner et approuver les nouveaux comptes",
      href: "/partenaires?status=pending",
      icon: Users,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/15",
      badge: stats?.pendingPartners,
    },
    {
      label: "Modérer les publications",
      caption: "Approuver / rejeter les événements",
      href: "/publications",
      icon: FileText,
      iconColor: "text-sky-400",
      iconBg: "bg-sky-500/15",
      badge: stats?.pendingPublications,
    },
    {
      label: "Traiter les demandes de suppression",
      caption: "Comptes utilisateurs à supprimer",
      href: "/suppressions",
      icon: Trash2,
      iconColor: "text-rose-400",
      iconBg: "bg-rose-500/15",
      badge: stats?.pendingDeletionRequests,
    },
    {
      label: "Voir les statistiques",
      caption: "Inscriptions par jour, semaine, mois",
      href: "/statistiques",
      icon: TrendingUp,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/15",
    },
  ];

  return (
    <AdminLayout>
      <div className="min-h-full bg-gradient-to-br from-background via-background to-primary/5">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-6 md:py-10">
          {/* HERO */}
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/15 via-card to-card p-6 md:p-8 mb-8 shadow-xl shadow-primary/5">
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -left-12 w-72 h-72 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                    NoStress Admin
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                  Bonjour {admin?.name?.split(" ")[0] ?? "Admin"} 👋
                </h1>
                <p className="text-muted-foreground mt-2 max-w-xl">
                  {urgentCount > 0
                    ? `Vous avez ${urgentCount} action${urgentCount > 1 ? "s" : ""} en attente aujourd'hui.`
                    : "Tout est à jour. Aucune action en attente."}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-2 capitalize">
                  {formatDate(today)}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 items-start">
                <button
                  onClick={loadStats}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 backdrop-blur px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  Actualiser
                </button>
                <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/40 backdrop-blur px-4 py-3 min-w-[160px]">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
                    <Users className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Utilisateurs</p>
                    <p className="text-xl font-bold text-foreground">{stats?.totalUsers ?? 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/40 backdrop-blur px-4 py-3 min-w-[160px]">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Partenaires</p>
                    <p className="text-xl font-bold text-foreground">{totalPartners}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/40 backdrop-blur px-4 py-3 min-w-[160px]">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Publications</p>
                    <p className="text-xl font-bold text-foreground">
                      {stats?.totalPublications ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* KPI GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            {loading
              ? Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-border bg-card p-5 animate-pulse h-36"
                    >
                      <div className="h-10 w-10 rounded-xl bg-muted mb-4" />
                      <div className="h-7 bg-muted rounded w-16 mb-2" />
                      <div className="h-3 bg-muted rounded w-32" />
                    </div>
                  ))
              : kpiCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Link key={card.title} href={card.link}>
                      <div
                        className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br ${card.gradient} bg-card p-5 cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div
                            className={`w-11 h-11 rounded-xl ${card.iconBg} ring-1 ${card.ring} flex items-center justify-center`}
                          >
                            <Icon className={`w-5 h-5 ${card.iconColor}`} />
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-bold text-foreground tracking-tight">
                            {card.value}
                          </p>
                          {card.urgent && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              urgent
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground/90 mt-1">
                          {card.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{card.caption}</p>
                      </div>
                    </Link>
                  );
                })}
          </div>

          {/* TWO-COL: QUICK ACTIONS + BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick actions — 2 cols */}
            <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="font-semibold text-foreground">Actions rapides</h2>
                </div>
                {urgentCount > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1">
                    <Bell className="w-3 h-3" />
                    {urgentCount} en attente
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.href} href={action.href}>
                      <div className="group flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-background/40 hover:bg-background/80 hover:border-primary/40 cursor-pointer transition-all hover:-translate-y-0.5">
                        <div
                          className={`w-10 h-10 rounded-lg ${action.iconBg} flex items-center justify-center flex-shrink-0`}
                        >
                          <Icon className={`w-4 h-4 ${action.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                            {action.label}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {action.caption}
                          </p>
                        </div>
                        {typeof action.badge === "number" && action.badge > 0 && (
                          <span className="text-xs font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">
                            {action.badge}
                          </span>
                        )}
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Breakdown — 1 col */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <h2 className="font-semibold text-foreground">Répartition partenaires</h2>
              </div>
              {!stats ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-3 bg-muted rounded w-24" />
                      <div className="h-2 bg-muted rounded w-full" />
                    </div>
                  ))}
                </div>
              ) : totalPartners === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Aucun partenaire encore inscrit</p>
                </div>
              ) : (
                <>
                  <div className="mb-5 pb-5 border-b border-border/50">
                    <p className="text-3xl font-bold text-foreground">{totalPartners}</p>
                    <p className="text-xs text-muted-foreground mt-1">Partenaires au total</p>
                  </div>
                  <div className="space-y-4">
                    {partnerBreakdown.map((row) => {
                      const pct = totalPartners > 0 ? (row.value / totalPartners) * 100 : 0;
                      return (
                        <div key={row.label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${row.dot}`} />
                              <span className="text-sm text-foreground">{row.label}</span>
                            </div>
                            <span className="text-sm font-semibold text-foreground tabular-nums">
                              {row.value}
                              <span className="text-xs text-muted-foreground ml-1.5">
                                ({Math.round(pct)}%)
                              </span>
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${row.color} rounded-full transition-all duration-700 ease-out`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground/60 text-center mt-10">
            NoStress Admin · {today.getFullYear()}
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
