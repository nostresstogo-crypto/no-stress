import React, { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { api, type ConfigCountry, type ConfigCity, type ConfigEventCategory, type ConfigVenueType } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, Pencil, Trash2, RefreshCw, Globe, MapPin, Tag, Building2 } from "lucide-react";

// ─── Toast helper ──────────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const show = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };
  return { toast, show };
}

function Toast({ toast }: { toast: { msg: string; type: "success" | "error" } | null }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
      toast.type === "success" ? "bg-green-600 text-white" : "bg-destructive text-white"
    }`}>
      {toast.msg}
    </div>
  );
}

// ─── Countries tab ─────────────────────────────────────────────────────────────

function CountriesTab() {
  const { toast, show } = useToast();
  const [countries, setCountries] = useState<ConfigCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ConfigCountry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConfigCountry | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", emoji: "🌍" });

  const load = useCallback(() => {
    setLoading(true);
    api.config.listCountries()
      .then((r) => setCountries(r.countries))
      .catch((e) => show(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ code: "", name: "", emoji: "🌍" }); setFormOpen(true); };
  const openEdit = (c: ConfigCountry) => { setEditing(c); setForm({ code: c.code, name: c.name, emoji: c.emoji }); setFormOpen(true); };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) { show("Code et nom requis.", "error"); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.config.updateCountry(editing.id, form);
        show("Pays mis à jour.");
      } else {
        await api.config.createCountry(form);
        show("Pays ajouté.");
      }
      setFormOpen(false);
      load();
    } catch (e: any) { show(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.config.deleteCountry(deleteTarget.id);
      show("Pays supprimé.");
      setDeleteTarget(null);
      load();
    } catch (e: any) { show(e.message, "error"); setDeleteTarget(null); }
    finally { setDeleteLoading(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{countries.length} pays</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></Button>
          <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Emoji</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Code</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Nom</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {countries.map((c, i) => (
                <tr key={c.id} className={`border-t border-border ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                  <td className="px-4 py-2.5 text-lg">{c.emoji}</td>
                  <td className="px-4 py-2.5 font-mono font-medium">{c.code}</td>
                  <td className="px-4 py-2.5">{c.name}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(c)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {countries.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Aucun pays</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le pays" : "Ajouter un pays"}</DialogTitle>
            <DialogDescription>Renseignez les informations du pays.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Code (ex: TG)</Label>
                <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="TG" maxLength={3} />
              </div>
              <div className="space-y-1.5">
                <Label>Emoji drapeau</Label>
                <Input value={form.emoji} onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))} placeholder="🇹🇬" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nom du pays</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Togo" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {deleteTarget?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. Si des villes sont liées à ce pays, la suppression sera bloquée.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-destructive hover:bg-destructive/90">
              {deleteLoading ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toast toast={toast} />
    </div>
  );
}

// ─── Cities tab ────────────────────────────────────────────────────────────────

function CitiesTab() {
  const { toast, show } = useToast();
  const [cities, setCities] = useState<ConfigCity[]>([]);
  const [countries, setCountries] = useState<ConfigCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState<number | "">("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ConfigCity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConfigCity | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form, setForm] = useState({ slug: "", name: "", countryId: "", emoji: "🏙️", latitude: "", longitude: "" });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.config.listCities(), api.config.listCountries()])
      .then(([cr, cc]) => { setCities(cr.cities); setCountries(cc.countries); })
      .catch((e) => show(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = cities.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !search || c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q) || (c.countryName ?? "").toLowerCase().includes(q);
    const matchCountry = filterCountry === "" || c.countryId === filterCountry;
    return matchSearch && matchCountry;
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ slug: "", name: "", countryId: countries[0] ? String(countries[0].id) : "", emoji: "🏙️", latitude: "", longitude: "" });
    setFormOpen(true);
  };
  const openEdit = (c: ConfigCity) => {
    setEditing(c);
    setForm({ slug: c.slug, name: c.name, countryId: String(c.countryId), emoji: c.emoji, latitude: c.latitude != null ? String(c.latitude) : "", longitude: c.longitude != null ? String(c.longitude) : "" });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.slug.trim() || !form.name.trim() || !form.countryId) { show("Slug, nom et pays requis.", "error"); return; }
    setSaving(true);
    try {
      const payload = {
        slug: form.slug.trim(),
        name: form.name.trim(),
        countryId: Number(form.countryId),
        emoji: form.emoji || "🏙️",
        latitude: form.latitude !== "" ? Number(form.latitude) : undefined,
        longitude: form.longitude !== "" ? Number(form.longitude) : undefined,
      };
      if (editing) {
        await api.config.updateCity(editing.id, payload);
        show("Ville mise à jour.");
      } else {
        await api.config.createCity(payload as any);
        show("Ville ajoutée.");
      }
      setFormOpen(false);
      load();
    } catch (e: any) { show(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.config.deleteCity(deleteTarget.id);
      show("Ville supprimée.");
      setDeleteTarget(null);
      load();
    } catch (e: any) { show(e.message, "error"); setDeleteTarget(null); }
    finally { setDeleteLoading(false); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-40">
          <input
            className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Rechercher une ville…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value === "" ? "" : Number(e.target.value))}
        >
          <option value="">Tous les pays</option>
          {countries.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
        <p className="text-sm text-muted-foreground">{filtered.length}/{cities.length}</p>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></Button>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Ville</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Slug</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Pays</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} className={`border-t border-border ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                  <td className="px-4 py-2.5">
                    <span className="mr-1.5">{c.emoji}</span>{c.name}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground hidden sm:table-cell">{c.slug}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.countryCode}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(c)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Aucune ville trouvée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la ville" : "Ajouter une ville"}</DialogTitle>
            <DialogDescription>Renseignez les informations de la ville.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nom</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Lomé" />
              </div>
              <div className="space-y-1.5">
                <Label>Emoji</Label>
                <Input value={form.emoji} onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))} placeholder="🏙️" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Slug (identifiant unique)</Label>
              <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} placeholder="lome" />
            </div>
            <div className="space-y-1.5">
              <Label>Pays</Label>
              <select
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.countryId}
                onChange={(e) => setForm((f) => ({ ...f, countryId: e.target.value }))}
              >
                <option value="">-- Choisir un pays --</option>
                {countries.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Latitude (optionnel)</Label>
                <Input type="number" step="any" value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} placeholder="6.1374" />
              </div>
              <div className="space-y-1.5">
                <Label>Longitude (optionnel)</Label>
                <Input type="number" step="any" value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} placeholder="1.2123" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {deleteTarget?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              La suppression sera bloquée si des événements ou des lieux font référence à cette ville.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-destructive hover:bg-destructive/90">
              {deleteLoading ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toast toast={toast} />
    </div>
  );
}

// ─── Event Categories tab ──────────────────────────────────────────────────────

function EventCategoriesTab() {
  const { toast, show } = useToast();
  const [cats, setCats] = useState<ConfigEventCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ConfigEventCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConfigEventCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form, setForm] = useState({ key: "", labelFr: "", labelEn: "", icon: "calendar", color: "#9B8FE8", sortOrder: "0" });

  const load = useCallback(() => {
    setLoading(true);
    api.config.listEventCategories()
      .then((r) => setCats(r.eventCategories))
      .catch((e) => show(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ key: "", labelFr: "", labelEn: "", icon: "calendar", color: "#9B8FE8", sortOrder: String(cats.length + 1) }); setFormOpen(true); };
  const openEdit = (c: ConfigEventCategory) => { setEditing(c); setForm({ key: c.key, labelFr: c.labelFr, labelEn: c.labelEn, icon: c.icon, color: c.color, sortOrder: String(c.sortOrder) }); setFormOpen(true); };

  const handleSave = async () => {
    if (!form.key.trim() || !form.labelFr.trim() || !form.labelEn.trim()) { show("Clé, libellé FR et EN requis.", "error"); return; }
    setSaving(true);
    try {
      const payload = { ...form, sortOrder: Number(form.sortOrder) };
      if (editing) {
        await api.config.updateEventCategory(editing.id, payload);
        show("Catégorie mise à jour.");
      } else {
        await api.config.createEventCategory(payload);
        show("Catégorie ajoutée.");
      }
      setFormOpen(false);
      load();
    } catch (e: any) { show(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.config.deleteEventCategory(deleteTarget.id);
      show("Catégorie supprimée.");
      setDeleteTarget(null);
      load();
    } catch (e: any) { show(e.message, "error"); setDeleteTarget(null); }
    finally { setDeleteLoading(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{cats.length} catégories</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></Button>
          <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Couleur</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Clé</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Libellé FR</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Libellé EN</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Ordre</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cats.map((c, i) => (
                <tr key={c.id} className={`border-t border-border ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                  <td className="px-4 py-2.5">
                    <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: c.color }} />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{c.key}</td>
                  <td className="px-4 py-2.5 font-medium">{c.labelFr}</td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{c.labelEn}</td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{c.sortOrder}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(c)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {cats.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aucune catégorie</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la catégorie" : "Ajouter une catégorie"}</DialogTitle>
            <DialogDescription>Catégorie d'événement proposée dans le formulaire de création.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Clé (identifiant unique, ex: concerts)</Label>
              <Input value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.trim() }))} placeholder="concerts" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Libellé français</Label>
                <Input value={form.labelFr} onChange={(e) => setForm((f) => ({ ...f, labelFr: e.target.value }))} placeholder="Concerts" />
              </div>
              <div className="space-y-1.5">
                <Label>Libellé anglais</Label>
                <Input value={form.labelEn} onChange={(e) => setForm((f) => ({ ...f, labelEn: e.target.value }))} placeholder="Concerts" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Icône (Ionicons)</Label>
                <Input value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="musical-notes" />
              </div>
              <div className="space-y-1.5">
                <Label>Couleur</Label>
                <div className="flex gap-2 items-center">
                  <Input type="color" className="w-10 h-9 p-0.5 cursor-pointer" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
                  <Input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} placeholder="#9B8FE8" className="flex-1" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Ordre d'affichage</Label>
              <Input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {deleteTarget?.labelFr} » ?</AlertDialogTitle>
            <AlertDialogDescription>La suppression sera bloquée si des événements utilisent encore cette catégorie.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-destructive hover:bg-destructive/90">
              {deleteLoading ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toast toast={toast} />
    </div>
  );
}

// ─── Venue Types tab ───────────────────────────────────────────────────────────

function VenueTypesTab() {
  const { toast, show } = useToast();
  const [types, setTypes] = useState<ConfigVenueType[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ConfigVenueType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConfigVenueType | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form, setForm] = useState({ key: "", labelFr: "", labelEn: "", icon: "business", sortOrder: "0" });

  const load = useCallback(() => {
    setLoading(true);
    api.config.listVenueTypes()
      .then((r) => setTypes(r.venueTypes))
      .catch((e) => show(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ key: "", labelFr: "", labelEn: "", icon: "business", sortOrder: String(types.length + 1) }); setFormOpen(true); };
  const openEdit = (t: ConfigVenueType) => { setEditing(t); setForm({ key: t.key, labelFr: t.labelFr, labelEn: t.labelEn, icon: t.icon, sortOrder: String(t.sortOrder) }); setFormOpen(true); };

  const handleSave = async () => {
    if (!form.key.trim() || !form.labelFr.trim() || !form.labelEn.trim()) { show("Clé, libellé FR et EN requis.", "error"); return; }
    setSaving(true);
    try {
      const payload = { ...form, sortOrder: Number(form.sortOrder) };
      if (editing) {
        await api.config.updateVenueType(editing.id, payload);
        show("Type de lieu mis à jour.");
      } else {
        await api.config.createVenueType(payload);
        show("Type de lieu ajouté.");
      }
      setFormOpen(false);
      load();
    } catch (e: any) { show(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.config.deleteVenueType(deleteTarget.id);
      show("Type supprimé.");
      setDeleteTarget(null);
      load();
    } catch (e: any) { show(e.message, "error"); setDeleteTarget(null); }
    finally { setDeleteLoading(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{types.length} types</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></Button>
          <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Clé</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Libellé FR</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Libellé EN</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Icône</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Ordre</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t, i) => (
                <tr key={t.id} className={`border-t border-border ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                  <td className="px-4 py-2.5 font-mono text-xs">{t.key}</td>
                  <td className="px-4 py-2.5 font-medium">{t.labelFr}</td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{t.labelEn}</td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell font-mono text-xs">{t.icon}</td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{t.sortOrder}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(t)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {types.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aucun type de lieu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le type de lieu" : "Ajouter un type de lieu"}</DialogTitle>
            <DialogDescription>Type de lieu proposé dans le formulaire d'inscription partenaire.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Clé (identifiant unique, ex: Nightclub)</Label>
              <Input value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} placeholder="Nightclub" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Libellé français</Label>
                <Input value={form.labelFr} onChange={(e) => setForm((f) => ({ ...f, labelFr: e.target.value }))} placeholder="Boîte de nuit" />
              </div>
              <div className="space-y-1.5">
                <Label>Libellé anglais</Label>
                <Input value={form.labelEn} onChange={(e) => setForm((f) => ({ ...f, labelEn: e.target.value }))} placeholder="Nightclub" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Icône (Ionicons)</Label>
                <Input value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="wine" />
              </div>
              <div className="space-y-1.5">
                <Label>Ordre d'affichage</Label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} placeholder="0" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {deleteTarget?.labelFr} » ?</AlertDialogTitle>
            <AlertDialogDescription>La suppression sera bloquée si des lieux utilisent encore ce type.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-destructive hover:bg-destructive/90">
              {deleteLoading ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toast toast={toast} />
    </div>
  );
}

// ─── Main Settings page ────────────────────────────────────────────────────────

type TabId = "countries" | "cities" | "event-categories" | "venue-types";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "countries",         label: "Pays",                  icon: <Globe className="w-4 h-4" /> },
  { id: "cities",            label: "Villes",                icon: <MapPin className="w-4 h-4" /> },
  { id: "event-categories",  label: "Catégories d'événements", icon: <Tag className="w-4 h-4" /> },
  { id: "venue-types",       label: "Types de lieux",        icon: <Building2 className="w-4 h-4" /> },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>("countries");

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Paramètres</h1>
          <p className="text-muted-foreground mt-1">Gérez les listes de référence utilisées dans l'application.</p>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-1 mb-6 bg-muted/40 rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center sm:flex-initial ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab label for mobile */}
        <div className="sm:hidden mb-4">
          <h2 className="text-base font-semibold">{TABS.find((t) => t.id === activeTab)?.label}</h2>
        </div>

        {/* Tab content */}
        {activeTab === "countries" && <CountriesTab />}
        {activeTab === "cities" && <CitiesTab />}
        {activeTab === "event-categories" && <EventCategoriesTab />}
        {activeTab === "venue-types" && <VenueTypesTab />}
      </div>
    </AdminLayout>
  );
}
