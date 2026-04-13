import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { api } from "@/lib/api";
import { Link } from "wouter";
import { Users, Clock, CheckCircle, XCircle, Trash2, ArrowRight, TrendingUp, FileText } from "lucide-react";

interface Stats {
  pendingPartners: number;
  approvedPartners: number;
  rejectedPartners: number;
  totalDeletionRequests: number;
  pendingDeletionRequests: number;
  pendingPublications: number;
  totalPublications: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.admin.stats().then(setStats).catch(console.error);
  }, []);

  const statCards = stats
    ? [
        {
          title: "Partenaires en attente",
          value: stats.pendingPartners,
          icon: Clock,
          color: "text-yellow-400",
          bg: "bg-yellow-400/10",
          urgent: stats.pendingPartners > 0,
          link: "/partenaires?status=pending",
        },
        {
          title: "Partenaires approuvés",
          value: stats.approvedPartners,
          icon: CheckCircle,
          color: "text-green-400",
          bg: "bg-green-400/10",
          link: "/partenaires?status=approved",
        },
        {
          title: "Partenaires rejetés",
          value: stats.rejectedPartners,
          icon: XCircle,
          color: "text-destructive",
          bg: "bg-destructive/10",
          link: "/partenaires?status=rejected",
        },
        {
          title: "Demandes de suppression",
          value: stats.pendingDeletionRequests,
          icon: Trash2,
          color: "text-orange-400",
          bg: "bg-orange-400/10",
          urgent: stats.pendingDeletionRequests > 0,
          link: "/suppressions",
        },
        {
          title: "Publications à modérer",
          value: stats.pendingPublications,
          icon: FileText,
          color: "text-blue-400",
          bg: "bg-blue-400/10",
          urgent: stats.pendingPublications > 0,
          link: "/publications",
        },
      ]
    : [];

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">Vue d'ensemble de la plateforme NoStress</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4 mb-8">
          {!stats
            ? Array(4)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
                    <div className="h-4 bg-muted rounded w-32 mb-4" />
                    <div className="h-8 bg-muted rounded w-16" />
                  </div>
                ))
            : statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link key={card.title} href={card.link ?? "#"}>
                    <div
                      className={`bg-card border rounded-xl p-5 cursor-pointer hover:border-primary/50 transition-colors ${
                        card.urgent ? "border-yellow-500/40" : "border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${card.color}`} />
                        </div>
                        {card.urgent && (
                          <span className="text-xs bg-yellow-400/15 text-yellow-400 px-2 py-0.5 rounded-full font-medium">
                            Action requise
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-foreground">{card.value}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{card.title}</p>
                    </div>
                  </Link>
                );
              })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Actions rapides
              </h2>
            </div>
            <div className="space-y-2">
              <Link href="/partenaires?status=pending">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors group">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm">Valider les nouvelles inscriptions partenaires</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
              <Link href="/suppressions">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors group">
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-4 h-4 text-orange-400" />
                    <span className="text-sm">Traiter les demandes de suppression</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
              <Link href="/partenaires">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors group">
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-sm">Voir tous les partenaires</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
              <Link href="/publications">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors group">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">Modérer les publications</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
              <Link href="/statistiques">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors group">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-sm">Voir les statistiques d'inscription</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-foreground">Récapitulatif partenaires</h2>
            </div>
            {stats && (
              <div className="space-y-3">
                {[
                  { label: "Approuvés", value: stats.approvedPartners, color: "bg-green-400", total: stats.approvedPartners + stats.pendingPartners + stats.rejectedPartners },
                  { label: "En attente", value: stats.pendingPartners, color: "bg-yellow-400", total: stats.approvedPartners + stats.pendingPartners + stats.rejectedPartners },
                  { label: "Rejetés", value: stats.rejectedPartners, color: "bg-destructive", total: stats.approvedPartners + stats.pendingPartners + stats.rejectedPartners },
                ].map((row) => {
                  const pct = row.total > 0 ? Math.round((row.value / row.total) * 100) : 0;
                  return (
                    <div key={row.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">{row.label}</span>
                        <span className="text-sm font-medium text-foreground">{row.value} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${row.color} rounded-full transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
