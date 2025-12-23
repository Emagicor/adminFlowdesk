const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://flowdeskapi.build91.in/api/v1";

// Get token from localStorage
const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
};

// API request helper with retry for rate limiting
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = 5,
  retryCount = 0
): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  // DEBUG: Log the full URL to see customer_id parameter
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  console.log(`🔵 [API Request] ${options.method || "GET"} ${fullUrl}`);

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    // Handle rate limiting with exponential backoff
    if (response.status === 429 && retries > 0) {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 16000);
      console.log(
        `Rate limited. Retrying in ${
          backoffDelay / 1000
        }s... (${retries} retries left)`
      );

      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      return apiRequest<T>(endpoint, options, retries - 1, retryCount + 1);
    }

    const data = await response.json();

    if (!response.ok) {
      // Don't throw error for rate limit - we've exhausted retries
      if (response.status === 429) {
        console.error(`❌ [API Error] Rate limit exhausted for ${fullUrl}`);
        throw new Error("Server is busy. Please wait a moment and try again.");
      }
      console.error(`❌ [API Error] ${response.status} ${fullUrl}`, data);
      throw new Error(data.message || "API request failed");
    }

    console.log(`✅ [API Success] ${fullUrl}`);

    return data;
  } catch (error: any) {
    // Network errors or fetch failures
    if (error.message === "Failed to fetch" || error.name === "TypeError") {
      if (retries > 0) {
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 16000);
        console.log(`Network error. Retrying in ${backoffDelay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        return apiRequest<T>(endpoint, options, retries - 1, retryCount + 1);
      }
      throw new Error(
        "Unable to connect to server. Please check your connection."
      );
    }
    throw error;
  }
}

// Form data request helper (for file uploads)
async function formDataRequest<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Upload failed");
  }

  return data;
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{ success: boolean; data: { token: string; user: any } }>(
      "/auth/admin/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    ),

  getMe: () =>
    apiRequest<{ success: boolean; data: { user: any } }>("/auth/me"),

  logout: () =>
    apiRequest<{ success: boolean }>("/auth/logout", { method: "POST" }),
};

// Customers API
export const customersApi = {
  list: (page = 1, limit = 10, search = "") =>
    apiRequest<any>(
      `/admin/customers?page=${page}&limit=${limit}&search=${search}`
    ),

  getById: (id: string) => apiRequest<any>(`/admin/customers/${id}`),

  create: (data: any) =>
    apiRequest<any>("/admin/customers", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiRequest<any>(`/admin/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<any>(`/admin/customers/${id}`, { method: "DELETE" }),

  setPassword: (id: string, password: string) =>
    apiRequest<any>(`/admin/customers/${id}/set-password`, {
      method: "PUT",
      body: JSON.stringify({ password }),
    }),
};

// Projects API
export const projectsApi = {
  list: (page = 1, limit = 10, customerId?: string, status?: string) => {
    let url = `/projects?page=${page}&limit=${limit}`;
    if (customerId) url += `&customer_id=${customerId}`;
    if (status) url += `&status=${status}`;
    return apiRequest<any>(url);
  },

  listByCustomer: (customerId: string) =>
    apiRequest<any>(`/customers/${customerId}/projects`),

  getById: (id: string) => apiRequest<any>(`/projects/${id}`),

  getTimeline: (id: string) => apiRequest<any>(`/projects/${id}/timeline`),

  create: (data: any) =>
    apiRequest<any>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiRequest<any>(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<any>(`/projects/${id}`, { method: "DELETE" }),
};

// Phases API
export const phasesApi = {
  listByProject: (projectId: string) =>
    apiRequest<any>(`/projects/${projectId}/phases`),

  getById: (id: string) => apiRequest<any>(`/phases/${id}`),

  update: (id: string, data: any) =>
    apiRequest<any>(`/phases/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  addContact: (phaseId: string, data: any) =>
    apiRequest<any>(`/phases/${phaseId}/contacts`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  removeContact: (phaseId: string, contactId: string) =>
    apiRequest<any>(`/phases/${phaseId}/contacts/${contactId}`, {
      method: "DELETE",
    }),
};

// Tasks API
export const tasksApi = {
  listByPhase: (phaseId: string, status?: string, type?: string) => {
    let url = `/phases/${phaseId}/tasks`;
    const params = [];
    if (status) params.push(`status=${status}`);
    if (type) params.push(`type=${type}`);
    if (params.length) url += `?${params.join("&")}`;
    return apiRequest<any>(url);
  },

  getById: (id: string) => apiRequest<any>(`/tasks/${id}`),

  create: (phaseId: string, data: any) =>
    apiRequest<any>(`/phases/${phaseId}/tasks`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiRequest<any>(`/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, status: string) =>
    apiRequest<any>(`/tasks/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  delete: (id: string) => apiRequest<any>(`/tasks/${id}`, { method: "DELETE" }),
};

// Documents API
export const documentsApi = {
  listByProject: (projectId: string, phaseId?: string, category?: string) => {
    let url = `/projects/${projectId}/documents`;
    const params = [];
    if (phaseId) params.push(`phase_id=${phaseId}`);
    if (category) params.push(`category=${category}`);
    if (params.length) url += `?${params.join("&")}`;
    return apiRequest<any>(url);
  },

  getById: (id: string) => apiRequest<any>(`/documents/${id}`),

  getDownloadUrl: (id: string) => apiRequest<any>(`/documents/${id}/download`),

  upload: (formData: FormData) =>
    formDataRequest<any>("/documents/upload", formData),

  update: (id: string, data: any) =>
    apiRequest<any>(`/documents/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  review: (id: string, reviewStatus: string, notes?: string) =>
    apiRequest<any>(`/documents/${id}/review`, {
      method: "PUT",
      body: JSON.stringify({
        review_status: reviewStatus,
        approval_notes: notes,
      }),
    }),

  delete: (id: string) =>
    apiRequest<any>(`/documents/${id}`, { method: "DELETE" }),
};

// Meetings API
export const meetingsApi = {
  listByProject: (projectId: string, page = 1, limit = 20) =>
    apiRequest<any>(
      `/projects/${projectId}/meetings?page=${page}&limit=${limit}`
    ),

  getById: (id: string) => apiRequest<any>(`/meetings/${id}`),

  create: (data: any) =>
    apiRequest<any>("/meetings", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiRequest<any>(`/meetings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<any>(`/meetings/${id}`, { method: "DELETE" }),

  linkDocument: (meetingId: string, documentId: string) =>
    apiRequest<any>(`/meetings/${meetingId}/documents`, {
      method: "POST",
      body: JSON.stringify({ document_id: documentId }),
    }),

  unlinkDocument: (meetingId: string, documentId: string) =>
    apiRequest<any>(`/meetings/${meetingId}/documents/${documentId}`, {
      method: "DELETE",
    }),
};

// Notifications API
export const notificationsApi = {
  list: (customerId?: string, page = 1, limit = 20, read?: boolean) => {
    let url = `/notifications?page=${page}&limit=${limit}`;
    if (customerId) url += `&customer_id=${customerId}`;
    if (read !== undefined) url += `&read=${read}`;
    return apiRequest<any>(url);
  },

  getById: (id: string) => apiRequest<any>(`/notifications/${id}`),

  create: (data: any) =>
    apiRequest<any>("/notifications", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiRequest<any>(`/notifications/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<any>(`/notifications/${id}`, { method: "DELETE" }),

  markAsRead: (id: string) =>
    apiRequest<any>(`/notifications/${id}/read`, { method: "PUT" }),

  markAllAsRead: (customerId?: string) =>
    apiRequest<any>(`/notifications/read-all`, {
      method: "PUT",
      body: customerId
        ? JSON.stringify({ customer_id: customerId })
        : undefined,
    }),

  deleteAllForCustomer: (customerId: string) =>
    apiRequest<any>(`/notifications/customer/${customerId}`, {
      method: "DELETE",
    }),
};

// Crew API (Phase Contacts)
export const crewApi = {
  // Get all crew for a project
  listByProject: (projectId: string) =>
    apiRequest<any>(`/projects/${projectId}/crew`),

  // Get all crew for a phase
  listByPhase: (phaseId: string) => apiRequest<any>(`/phases/${phaseId}/crew`),

  // Get crew member by ID
  getById: (id: string) => apiRequest<any>(`/crew/${id}`),

  // Add crew member to a phase
  create: (phaseId: string, data: any) =>
    apiRequest<any>(`/phases/${phaseId}/crew`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Update crew member
  update: (id: string, data: any) =>
    apiRequest<any>(`/crew/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Delete crew member
  delete: (id: string) =>
    apiRequest<any>(`/crew/${id}`, {
      method: "DELETE",
    }),
};

export default apiRequest;
