const API_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, "").replace("/nostress-admin", "")}/api`;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("admin_token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options?.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erreur réseau" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  admin: {
    login: (email: string, password: string) =>
      request<{ token: string; admin: { id: string; name: string; email: string } }>("/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    logout: () => request("/admin/logout", { method: "POST" }),
    me: () => request<{ admin: { adminId: string; name: string; email: string } }>("/admin/me"),
    stats: () =>
      request<{
        pendingPartners: number;
        approvedPartners: number;
        rejectedPartners: number;
        totalDeletionRequests: number;
        pendingDeletionRequests: number;
      }>("/admin/stats"),
  },
  partners: {
    list: (status?: string) =>
      request<Partner[]>(`/partners${status ? `?status=${status}` : ""}`),
    get: (id: string) => request<Partner>(`/partners/${id}`),
    approve: (id: string) =>
      request<{ message: string; partner: Partner }>(`/admin/partners/${id}/approve`, { method: "POST" }),
    reject: (id: string, reason: string) =>
      request<{ message: string; partner: Partner }>(`/admin/partners/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
  },
  deletionRequests: {
    list: (status?: string) =>
      request<DeletionRequest[]>(`/admin/deletion-requests${status ? `?status=${status}` : ""}`),
    process: (id: string) =>
      request<{ message: string }>(`/admin/deletion-requests/${id}/process`, { method: "POST" }),
  },
};

export interface Partner {
  id: string;
  email: string;
  contactName: string;
  businessName: string;
  businessType: string;
  phone: string;
  city: string;
  description: string | null;
  websiteUrl: string | null;
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
  createdAt: string;
}
