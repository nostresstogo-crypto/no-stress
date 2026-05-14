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
import { Plus, Pencil, Trash2, RefreshCw, Globe, MapPin, Tag, Building2, Search } from "lucide-react";

// ─── Ionicons web component type declaration ────────────────────────────────
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "ion-icon": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { name?: string }, HTMLElement>;
    }
  }
}

function useIonicons() {
  useEffect(() => {
    if (document.getElementById("ionicons-esm")) return;
    const s1 = document.createElement("script");
    s1.id = "ionicons-esm";
    s1.type = "module";
    s1.src = "https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js";
    document.head.appendChild(s1);
    const s2 = document.createElement("script");
    s2.setAttribute("nomodule", "");
    s2.src = "https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js";
    document.head.appendChild(s2);
  }, []);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Converts a 2-letter ISO country code to its flag emoji (e.g. "TG" → "🇹🇬") */
function codeToFlagEmoji(code: string): string {
  if (!code || code.length < 2) return "🌍";
  const upper = code.toUpperCase().slice(0, 2);
  return Array.from(upper)
    .map((ch) => String.fromCodePoint(0x1F1E6 + ch.charCodeAt(0) - 65))
    .join("");
}

/** Returns the flagcdn.com image URL for a 2-letter code */
function flagImgUrl(code: string, size: 20 | 40 = 20): string {
  return `https://flagcdn.com/w${size}/${code.toLowerCase()}.png`;
}

function FlagImg({ code, size = 20, className = "" }: { code: string; size?: 20 | 40; className?: string }) {
  return (
    <img
      src={flagImgUrl(code, size)}
      alt={code}
      width={size}
      height={Math.round(size * 0.75)}
      className={`inline-block object-cover rounded-sm ${className}`}
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}

// ─── Data lists ─────────────────────────────────────────────────────────────

const CITY_EMOJIS = [
  "🏙️","🌆","🌇","🌃","🌉","🏖️","🏝️","🏜️","🏔️","⛰️","🗺️","📍","🏠","🏢","🏛️","🕌","⛪","🗼",
  "🌴","🌊","🌺","🌸","🌻","🌹","🦁","🐘","🦒","🐊","🦅","🌅","🌄","🏞️","🏕️","🛖","🌾","🎪",
  "🎡","🎢","🎠","⚓","🚢","✈️","🚂","🌐","💫","⭐","🌟","✨","🎆","🎇","🪐","🌙","☀️",
];

const IONICONS_LIST = [
  // Events & Entertainment
  "musical-notes","musical-note","ticket","calendar","star","heart","trophy","medal","ribbon",
  "mic","headset","tv","radio","camera","film","game-controller","color-palette","brush",
  // Places
  "business","restaurant","wine","beer","cafe","home","building","storefront","library","school",
  "football","basketball","fitness","bicycle","boat","airplane","train","car",
  // People & Social
  "people","person","happy","flower","leaf","tree","water","flame","flash","sunny","moon","cloud",
  // Misc
  "globe","map","location","time","cash","card","wallet","gift","bag","shirt","diamond",
  "phone","mail","chatbubble","notifications","shield","key","settings","analytics","search",
  "star-half","heart-half","thumbs-up","hand-left","accessibility","body","eye","ear",
  "paw","fish","bug","cube","diamond-outline","sparkles","bonfire","balloon","party-popper",
];

const CATEGORY_COLORS = [
  "#9B8FE8","#F87171","#FB923C","#FBBF24","#34D399","#38BDF8","#818CF8","#F472B6",
  "#A78BFA","#4ADE80","#F59E0B","#EC4899","#06B6D4","#84CC16","#EF4444","#8B5CF6",
];

// ─── Toast helper ────────────────────────────────────────────────────────────

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

// ─── EmojiPicker ─────────────────────────────────────────────────────────────

function EmojiPicker({ value, onChange, list }: { value: string; onChange: (e: string) => void; list: string[] }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 p-2 border border-border rounded-md bg-muted/30">
        <span className="text-2xl w-8 text-center">{value || "?"}</span>
        <span className="text-xs text-muted-foreground">Sélectionné</span>
      </div>
      <div className="grid grid-cols-10 gap-1 max-h-36 overflow-y-auto p-1 border border-border rounded-md bg-background">
        {list.map((em) => (
          <button
            key={em}
            type="button"
            onClick={() => onChange(em)}
            className={`text-xl h-8 w-8 rounded hover:bg-muted transition-colors flex items-center justify-center ${value === em ? "bg-primary/20 ring-1 ring-primary" : ""}`}
            title={em}
          >
            {em}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── IconPicker ──────────────────────────────────────────────────────────────

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  useIonicons();
  const [search, setSearch] = useState("");
  const filtered = IONICONS_LIST.filter((ic) => !search || ic.includes(search.toLowerCase()));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 p-2 border border-border rounded-md bg-muted/30">
        <span className="text-xl w-8 text-center">
          <ion-icon name={value} style={{ fontSize: "20px" }} />
        </span>
        <span className="text-xs font-mono text-muted-foreground">{value || "—"}</span>
      </div>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          className="w-full pl-7 pr-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Rechercher une icône…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto p-1 border border-border rounded-md bg-background">
        {filtered.map((ic) => (
          <button
            key={ic}
            type="button"
            onClick={() => onChange(ic)}
            title={ic}
            className={`h-9 w-9 rounded hover:bg-muted transition-colors flex flex-col items-center justify-center gap-0.5 ${value === ic ? "bg-primary/20 ring-1 ring-primary" : ""}`}
          >
            <ion-icon name={ic} style={{ fontSize: "18px" }} />
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-8 py-4 text-center text-xs text-muted-foreground">Aucune icône trouvée</div>
        )}
      </div>
    </div>
  );
}

// ─── Countries tab ───────────────────────────────────────────────────────────

function CountriesTab() {
  const { toast, show } = useToast();
  const [countries, setCountries] = useState<ConfigCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ConfigCountry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConfigCountry | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form, setForm] = useState({ code: "", name: "" });

  const load = useCallback(() => {
    setLoading(true);
    api.config.listCountries()
      .then((r) => setCountries(r.countries))
      .catch((e) => show(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ code: "", name: "" }); setFormOpen(true); };
  const openEdit = (c: ConfigCountry) => { setEditing(c); setForm({ code: c.code, name: c.name }); setFormOpen(true); };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) { show("Code et nom requis.", "error"); return; }
    const codeUp = form.code.trim().toUpperCase();
    const dupCode = countries.find(c => (!editing || c.id !== editing.id) && c.code === codeUp);
    if (dupCode) { show(`Le code « ${codeUp} » est déjà utilisé par « ${dupCode.name} ».`, "error"); return; }
    const dupName = countries.find(c => (!editing || c.id !== editing.id) && c.name.toLowerCase() === form.name.trim().toLowerCase());
    if (dupName) { show(`Le pays « ${form.name.trim()} » existe déjà.`, "error"); return; }
    setSaving(true);
    try {
      const emoji = codeToFlagEmoji(form.code.trim());
      const payload = { code: form.code.trim(), name: form.name.trim(), emoji };
      if (editing) {
        await api.config.updateCountry(editing.id, payload);
        show("Pays mis à jour.");
      } else {
        await api.config.createCountry(payload);
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
                  <td className="px-4 py-2.5">
                    <FlagImg code={c.code} size={20} />
                  </td>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le pays" : "Ajouter un pays"}</DialogTitle>
            <DialogDescription>Renseignez les informations du pays.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-[1fr_auto] gap-4 items-end">
              <div className="space-y-1.5">
                <Label>Code ISO (ex: TG)</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") }))}
                  placeholder="TG"
                  maxLength={2}
                  className="font-mono uppercase"
                />
              </div>
              <div className="flex flex-col items-center justify-end gap-1 pb-1">
                {form.code.length >= 2 ? (
                  <>
                    <FlagImg code={form.code} size={40} className="rounded" />
                    <span className="text-xs text-muted-foreground font-mono">{form.code}</span>
                  </>
                ) : (
                  <div className="w-10 h-[30px] rounded border border-dashed border-border bg-muted/30 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">?</span>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nom du pays</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Togo" />
            </div>
            <p className="text-xs text-muted-foreground">Le drapeau est généré automatiquement depuis le code ISO.</p>
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

// ─── Cities tab ──────────────────────────────────────────────────────────────

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
  const [form, setForm] = useState({ name: "", countryId: "", emoji: "🏙️", latitude: "", longitude: "" });

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
    const matchSearch = !search || c.name.toLowerCase().includes(q) || (c.countryName ?? "").toLowerCase().includes(q);
    const matchCountry = filterCountry === "" || c.countryId === filterCountry;
    return matchSearch && matchCountry;
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", countryId: countries[0] ? String(countries[0].id) : "", emoji: "🏙️", latitude: "", longitude: "" });
    setFormOpen(true);
  };
  const openEdit = (c: ConfigCity) => {
    setEditing(c);
    setForm({ name: c.name, countryId: String(c.countryId), emoji: c.emoji, latitude: c.latitude != null ? String(c.latitude) : "", longitude: c.longitude != null ? String(c.longitude) : "" });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.countryId) { show("Nom et pays requis.", "error"); return; }
    const dupName = cities.find(c => (!editing || c.id !== editing.id) && c.name.toLowerCase() === form.name.trim().toLowerCase() && String(c.countryId) === form.countryId);
    if (dupName) { show(`La ville « ${form.name.trim()} » existe déjà dans ce pays.`, "error"); return; }
    setSaving(true);
    try {
      const slug = slugify(form.name.trim());
      const payload = {
        slug,
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
                  <td className="px-4 py-2.5 text-muted-foreground">{c.countryCode}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(c)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Aucune ville trouvée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la ville" : "Ajouter une ville"}</DialogTitle>
            <DialogDescription>Renseignez les informations de la ville.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Lomé" />
              {form.name && (
                <p className="text-xs text-muted-foreground">Slug généré : <span className="font-mono">{slugify(form.name)}</span></p>
              )}
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
            <div className="space-y-1.5">
              <Label>Emoji</Label>
              <EmojiPicker value={form.emoji} onChange={(em) => setForm((f) => ({ ...f, emoji: em }))} list={CITY_EMOJIS} />
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

// ─── Event Categories tab ────────────────────────────────────────────────────

function EventCategoriesTab() {
  const { toast, show } = useToast();
  const [cats, setCats] = useState<ConfigEventCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ConfigEventCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConfigEventCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form, setForm] = useState({ labelFr: "", labelEn: "", icon: "calendar", color: "#9B8FE8" });

  const load = useCallback(() => {
    setLoading(true);
    api.config.listEventCategories()
      .then((r) => setCats(r.eventCategories))
      .catch((e) => show(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ labelFr: "", labelEn: "", icon: "calendar", color: "#9B8FE8" }); setFormOpen(true); };
  const openEdit = (c: ConfigEventCategory) => { setEditing(c); setForm({ labelFr: c.labelFr, labelEn: c.labelEn, icon: c.icon, color: c.color }); setFormOpen(true); };

  const handleSave = async () => {
    if (!form.labelFr.trim() || !form.labelEn.trim()) { show("Libellé FR et EN requis.", "error"); return; }
    const dupFr = cats.find(c => (!editing || c.id !== editing.id) && c.labelFr.toLowerCase() === form.labelFr.trim().toLowerCase());
    if (dupFr) { show(`La catégorie « ${form.labelFr.trim()} » existe déjà.`, "error"); return; }
    setSaving(true);
    try {
      const key = editing ? editing.key : slugify(form.labelFr.trim());
      const sortOrder = editing ? editing.sortOrder : cats.length + 1;
      const payload = { key, ...form, sortOrder };
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
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Libellé FR</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Libellé EN</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Icône</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cats.map((c, i) => (
                <tr key={c.id} className={`border-t border-border ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                  <td className="px-4 py-2.5">
                    <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: c.color }} />
                  </td>
                  <td className="px-4 py-2.5 font-medium">{c.labelFr}</td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{c.labelEn}</td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell font-mono text-xs">{c.icon}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(c)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {cats.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Aucune catégorie</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la catégorie" : "Ajouter une catégorie"}</DialogTitle>
            <DialogDescription>Catégorie d'événement proposée dans le formulaire de création.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Libellé français</Label>
                <Input
                  value={form.labelFr}
                  onChange={(e) => setForm((f) => ({ ...f, labelFr: e.target.value }))}
                  placeholder="Concerts"
                />
                {!editing && form.labelFr && (
                  <p className="text-xs text-muted-foreground">Clé : <span className="font-mono">{slugify(form.labelFr)}</span></p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Libellé anglais</Label>
                <Input value={form.labelEn} onChange={(e) => setForm((f) => ({ ...f, labelEn: e.target.value }))} placeholder="Concerts" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Couleur</Label>
              <div className="flex gap-2 items-center flex-wrap">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  className="w-7 h-7 rounded-full cursor-pointer border border-border p-0.5"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  title="Couleur personnalisée"
                />
                <span className="text-xs font-mono text-muted-foreground">{form.color}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Icône</Label>
              <IconPicker value={form.icon} onChange={(v) => setForm((f) => ({ ...f, icon: v }))} />
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

// ─── Venue Types tab ─────────────────────────────────────────────────────────

function VenueTypesTab() {
  const { toast, show } = useToast();
  const [types, setTypes] = useState<ConfigVenueType[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ConfigVenueType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConfigVenueType | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form, setForm] = useState({ labelFr: "", labelEn: "", icon: "business" });

  const load = useCallback(() => {
    setLoading(true);
    api.config.listVenueTypes()
      .then((r) => setTypes(r.venueTypes))
      .catch((e) => show(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ labelFr: "", labelEn: "", icon: "business" }); setFormOpen(true); };
  const openEdit = (t: ConfigVenueType) => { setEditing(t); setForm({ labelFr: t.labelFr, labelEn: t.labelEn, icon: t.icon }); setFormOpen(true); };

  const handleSave = async () => {
    if (!form.labelFr.trim() || !form.labelEn.trim()) { show("Libellé FR et EN requis.", "error"); return; }
    const dupFr = types.find(t => (!editing || t.id !== editing.id) && t.labelFr.toLowerCase() === form.labelFr.trim().toLowerCase());
    if (dupFr) { show(`Le type « ${form.labelFr.trim()} » existe déjà.`, "error"); return; }
    setSaving(true);
    try {
      const key = editing ? editing.key : slugify(form.labelFr.trim());
      const sortOrder = editing ? editing.sortOrder : types.length + 1;
      const payload = { key, ...form, sortOrder };
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
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Libellé FR</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Libellé EN</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Icône</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t, i) => (
                <tr key={t.id} className={`border-t border-border ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                  <td className="px-4 py-2.5 font-medium">{t.labelFr}</td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{t.labelEn}</td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell font-mono text-xs">{t.icon}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(t)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {types.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Aucun type de lieu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le type de lieu" : "Ajouter un type de lieu"}</DialogTitle>
            <DialogDescription>Type de lieu proposé dans le formulaire d'inscription partenaire.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Libellé français</Label>
                <Input
                  value={form.labelFr}
                  onChange={(e) => setForm((f) => ({ ...f, labelFr: e.target.value }))}
                  placeholder="Boîte de nuit"
                />
                {!editing && form.labelFr && (
                  <p className="text-xs text-muted-foreground">Clé : <span className="font-mono">{slugify(form.labelFr)}</span></p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Libellé anglais</Label>
                <Input value={form.labelEn} onChange={(e) => setForm((f) => ({ ...f, labelEn: e.target.value }))} placeholder="Nightclub" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Icône</Label>
              <IconPicker value={form.icon} onChange={(v) => setForm((f) => ({ ...f, icon: v }))} />
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

// ─── Main Settings page ──────────────────────────────────────────────────────

type TabId = "countries" | "cities" | "event-categories" | "venue-types";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "countries",        label: "Pays",                    icon: <Globe className="w-4 h-4" /> },
  { id: "cities",           label: "Villes",                  icon: <MapPin className="w-4 h-4" /> },
  { id: "event-categories", label: "Catégories d'événements", icon: <Tag className="w-4 h-4" /> },
  { id: "venue-types",      label: "Types de lieux",          icon: <Building2 className="w-4 h-4" /> },
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

        <div className="sm:hidden mb-4">
          <h2 className="text-base font-semibold">{TABS.find((t) => t.id === activeTab)?.label}</h2>
        </div>

        {activeTab === "countries" && <CountriesTab />}
        {activeTab === "cities" && <CitiesTab />}
        {activeTab === "event-categories" && <EventCategoriesTab />}
        {activeTab === "venue-types" && <VenueTypesTab />}
      </div>
    </AdminLayout>
  );
}
