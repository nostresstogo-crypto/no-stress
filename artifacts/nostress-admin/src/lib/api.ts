const API_BASE = import.meta.env.PROD
  ? "https://api.no-stress.net/api"
  : `${import.meta.env.BASE_URL.replace(/\/$/, "").replace("/nostress-admin", "")}/api`;

const TOKEN_KEY = "admin_token";
const REFRESH_KEY = "admin_refresh_token";

export function setAdminSession(token: string | null, refreshToken: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  else localStorage.removeItem(REFRESH_KEY);
}

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAdminRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

let refreshInflight: Promise<string | null> | null = null;
let _logoutCallback: (() => void) | null = null;

export function setLogoutCallback(fn: (() => void) | null): void {
  _logoutCallback = fn;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInflight) return refreshInflight;
  const rt = getAdminRefreshToken();
  if (!rt) return null;
  refreshInflight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) {
        setAdminSession(null, null);
        return null;
      }
      const data = await res.json();
      setAdminSession(data.token, data.refreshToken);
      return data.token as string;
    } catch {
      return null;
    } finally {
      refreshInflight = null;
    }
  })();
  return refreshInflight;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const buildHeaders = (token: string | null): HeadersInit => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options?.headers,
  });

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers: buildHeaders(getAdminToken()) });

  if (res.status === 401) {
    if (!getAdminRefreshToken()) {
      _logoutCallback?.();
      const error = await res.json().catch(() => ({ error: "Erreur réseau" }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await fetch(`${API_BASE}${path}`, { ...options, headers: buildHeaders(newToken) });
      if (res.status === 401) {
        _logoutCallback?.();
      }
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erreur réseau" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  admin: {
    login: (email: string, password: string) =>
      request<{ token: string; refreshToken: string; admin: { id: string; name: string; firstName?: string | null; email: string; role: string } }>("/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    logout: () => {
      const refreshToken = getAdminRefreshToken();
      return request("/admin/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    },
    me: () => request<{ admin: { adminId: string; name: string; firstName?: string | null; email: string; role: string } }>("/admin/me"),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ message: string }>("/admin/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    stats: () =>
      request<{
        pendingPartners: number;
        approvedPartners: number;
        rejectedPartners: number;
        totalDeletionRequests: number;
        pendingDeletionRequests: number;
        pendingPublications: number;
        totalPublications: number;
        totalUsers: number;
        totalVenues: number;
      }>("/admin/stats"),
  },
  partners: {
    list: (status?: string) =>
      request<Partner[]>(`/partners${status ? `?status=${status}` : ""}`),
    get: (id: string) => request<Partner>(`/partners/${id}`),
    approve: (id: string) =>
      request<{ message: string; partner: Partner; emailError?: boolean }>(`/admin/partners/${id}/approve`, { method: "POST" }),
    resendCredentials: (id: string) =>
      request<{ message: string }>(`/admin/partners/${id}/resend-credentials`, { method: "POST" }),
    reject: (id: string, reason: string) =>
      request<{ message: string; partner: Partner }>(`/admin/partners/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    delete: (id: string, reason: string) =>
      request<{ message: string; deleted: Partner }>(`/admin/partners/${id}`, {
        method: "DELETE",
        body: JSON.stringify({ reason }),
      }),
  },
  publications: {
    list: () => request<PartnerEvent[]>("/admin/events"),
    approve: (id: string) =>
      request<PartnerEvent>(`/admin/events/${id}/approve`, { method: "POST" }),
    reject: (id: string) =>
      request<PartnerEvent>(`/admin/events/${id}/reject`, { method: "POST" }),
    delete: (id: string, reason?: string) =>
      request<{ message: string; notification: string; deleted: PartnerEvent }>(`/admin/events/${id}`, {
        method: "DELETE",
        body: JSON.stringify({ reason }),
      }),
  },
  registrations: {
    stats: (period: "day" | "week" | "month" | "year") =>
      request<RegistrationStats>(`/admin/registrations/stats?period=${period}`),
  },
  venues: {
    list: (status?: string) =>
      request<{ venues: Venue[]; total: number }>(`/admin/venues${status ? `?status=${status}` : ""}`),
    approve: (id: string) => request<Venue>(`/admin/venues/${id}/approve`, { method: "POST" }),
    reject: (id: string, reason: string) =>
      request<Venue>(`/admin/venues/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
  },
  deletionRequests: {
    list: (status?: string) =>
      request<DeletionRequest[]>(`/admin/deletion-requests${status ? `?status=${status}` : ""}`),
    process: (id: string) =>
      request<{ message: string }>(`/admin/deletion-requests/${id}/process`, { method: "POST" }),
    deleteAccount: (id: string) =>
      request<{ message: string; deleted: { kind: "user" | "partner"; id: string } }>(
        `/admin/deletion-requests/${id}/delete-account`,
        { method: "POST" },
      ),
  },
  managers: {
    list: () => request<{ managers: Manager[] }>("/admin/managers"),
    create: (data: { name: string; firstName: string; email: string }) =>
      request<{ manager: Manager }>("/admin/managers", { method: "POST", body: JSON.stringify(data) }),
    resetPassword: (id: string) =>
      request<{ message: string }>(`/admin/managers/${id}/reset-password`, { method: "POST" }),
    delete: (id: string) =>
      request<{ message: string }>(`/admin/managers/${id}`, { method: "DELETE" }),
  },
  config: {
    // Countries
    listCountries: () => request<{ countries: ConfigCountry[] }>("/config/countries"),
    createCountry: (data: { code: string; name: string; emoji: string }) =>
      request<{ country: ConfigCountry }>("/admin/config/countries", { method: "POST", body: JSON.stringify(data) }),
    updateCountry: (id: number, data: Partial<{ code: string; name: string; emoji: string }>) =>
      request<{ country: ConfigCountry }>(`/admin/config/countries/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deleteCountry: (id: number) =>
      request<{ deleted: ConfigCountry }>(`/admin/config/countries/${id}`, { method: "DELETE" }),
    // Cities
    listCities: (countryId?: number) =>
      request<{ cities: ConfigCity[] }>(`/config/cities${countryId ? `?countryId=${countryId}` : ""}`),
    createCity: (data: { slug: string; name: string; countryId: number; emoji: string; latitude?: number; longitude?: number }) =>
      request<{ city: ConfigCity }>("/admin/config/cities", { method: "POST", body: JSON.stringify(data) }),
    updateCity: (id: number, data: Partial<{ slug: string; name: string; countryId: number; emoji: string; latitude: number; longitude: number }>) =>
      request<{ city: ConfigCity }>(`/admin/config/cities/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deleteCity: (id: number) =>
      request<{ deleted: ConfigCity }>(`/admin/config/cities/${id}`, { method: "DELETE" }),
    // Event categories
    listEventCategories: () => request<{ eventCategories: ConfigEventCategory[] }>("/config/event-categories"),
    createEventCategory: (data: { key: string; labelFr: string; labelEn: string; icon: string; color: string; sortOrder?: number }) =>
      request<{ eventCategory: ConfigEventCategory }>("/admin/config/event-categories", { method: "POST", body: JSON.stringify(data) }),
    updateEventCategory: (id: number, data: Partial<{ key: string; labelFr: string; labelEn: string; icon: string; color: string; sortOrder: number }>) =>
      request<{ eventCategory: ConfigEventCategory }>(`/admin/config/event-categories/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deleteEventCategory: (id: number) =>
      request<{ deleted: ConfigEventCategory }>(`/admin/config/event-categories/${id}`, { method: "DELETE" }),
    // Venue types
    listVenueTypes: () => request<{ venueTypes: ConfigVenueType[] }>("/config/venue-types"),
    createVenueType: (data: { key: string; labelFr: string; labelEn: string; icon: string; sortOrder?: number }) =>
      request<{ venueType: ConfigVenueType }>("/admin/config/venue-types", { method: "POST", body: JSON.stringify(data) }),
    updateVenueType: (id: number, data: Partial<{ key: string; labelFr: string; labelEn: string; icon: string; sortOrder: number }>) =>
      request<{ venueType: ConfigVenueType }>(`/admin/config/venue-types/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deleteVenueType: (id: number) =>
      request<{ deleted: ConfigVenueType }>(`/admin/config/venue-types/${id}`, { method: "DELETE" }),
  },
};

export interface Manager {
  id: string;
  name: string;
  firstName: string | null;
  email: string;
  createdAt: string;
}

export interface Partner {
  id: string;
  email: string;
  contactName: string;
  businessName: string;
  businessType: string;
  phone: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  websiteUrl: string | null;
  status: "pending" | "approved" | "rejected" | "archived";
  rejectionReason: string | null;
  subscriptionUntil?: string | null;
  subscription?: { active: boolean; subscriptionUntil: string | null; subscriptionStart: string | null; daysRemaining: number };
  createdAt: string;
  updatedAt: string;
}

export interface PartnerEvent {
  id: string;
  partnerId: string;
  partnerName: string;
  title: string;
  description: string;
  date: string;
  time: string;
  city: string;
  category: string;
  priceFCFA: number;
  isFree: boolean;
  status: "pending" | "approved" | "rejected" | "archived";
  isArchived?: boolean;
  createdAt: string;
}

export interface Venue {
  id: string;
  partnerId: string | null;
  partnerName: string | null;
  partnerEmail: string | null;
  name: string;
  type: string | null;
  city: string | null;
  address: string | null;
  description: string | null;
  phone: string | null;
  websiteUrl: string | null;
  imageUrl: string | null;
  images: string[];
  latitude: number | null;
  longitude: number | null;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeletionRequest {
  id: string;
  email: string;
  name: string;
  accountType: string;
  reason: string | null;
  status: "pending" | "processed";
  userId: string | null;
  partnerId: string | null;
  createdAt: string;
}

export interface RegistrationStats {
  partnerCount: number;
  clientCount: number;
  total: number;
  buckets: { label: string; partners: number; clients: number }[];
}

export interface ConfigCountry {
  id: number;
  code: string;
  name: string;
  emoji: string;
  createdAt: string;
}

export interface ConfigCity {
  id: number;
  slug: string;
  name: string;
  emoji: string;
  latitude: number | null;
  longitude: number | null;
  countryId: number;
  countryName?: string;
  countryCode?: string;
  createdAt?: string;
}

export interface ConfigEventCategory {
  id: number;
  key: string;
  labelFr: string;
  labelEn: string;
  icon: string;
  color: string;
  sortOrder: number;
  createdAt: string;
}

export interface ConfigVenueType {
  id: number;
  key: string;
  labelFr: string;
  labelEn: string;
  icon: string;
  sortOrder: number;
  createdAt: string;
}
