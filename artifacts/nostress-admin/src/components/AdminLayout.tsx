import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Users,
  Trash2,
  LogOut,
  Shield,
  ChevronRight,
  FileText,
  BarChart2,
  Menu,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/partenaires", label: "Partenaires", icon: Users },
  { href: "/publications", label: "Publications", icon: FileText },
  { href: "/suppressions", label: "Suppressions de compte", icon: Trash2 },
  { href: "/statistiques", label: "Statistiques", icon: BarChart2 },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface SidebarContentProps {
  location: string;
  admin: { name?: string; email?: string } | null;
  logout: () => void;
  onNavigate?: () => void;
}

function SidebarContent({ location, admin, logout, onNavigate }: SidebarContentProps) {
  return (
    <div className="h-full flex flex-col bg-[hsl(var(--sidebar))]">
      <div className="p-6 border-b border-[hsl(var(--sidebar-border))]">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-primary" />
          <span className="text-lg font-bold text-foreground">NoStress</span>
        </div>
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          Panneau Administrateur
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div
                onClick={onNavigate}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 opacity-50" />}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[hsl(var(--sidebar-border))]">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-xs font-bold">
              {admin?.name?.charAt(0) ?? "A"}
            </span>
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-foreground truncate">{admin?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{admin?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2"
          onClick={() => {
            onNavigate?.();
            logout();
          }}
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const { admin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <aside className="hidden md:flex w-64 border-r border-[hsl(var(--sidebar-border))] flex-shrink-0">
        <SidebarContent location={location} admin={admin} logout={logout} />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-[hsl(var(--sidebar))] border-b border-[hsl(var(--sidebar-border))] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-base font-bold text-foreground">NoStress Admin</span>
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-mobile-menu" aria-label="Ouvrir le menu">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 max-w-[85vw] border-r border-[hsl(var(--sidebar-border))]">
              <SidebarContent
                location={location}
                admin={admin}
                logout={logout}
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
