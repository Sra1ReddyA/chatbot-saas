const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiError extends Error {
  constructor(
    public message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token')
    : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  // Handle token expiry
  if (response.status === 401 && typeof window !== 'undefined') {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return request<T>(path, options);
    }
    window.location.href = '/login';
    throw new ApiError('Session expired', 401, 'TOKEN_EXPIRED');
  }

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error || 'Request failed',
      response.status,
      data.code
    );
  }

  return data.data;
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    if (data.success) {
      localStorage.setItem('access_token', data.data.tokens.accessToken);
      localStorage.setItem('refresh_token', data.data.tokens.refreshToken);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; name: string; organizationName: string }) =>
    request<{ user: User; organization: Organization; tokens: Tokens }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ user: User; organization: Organization; tokens: Tokens }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request('/api/auth/logout', { method: 'POST' }),

  me: () =>
    request<{ user: User; organization: Organization }>('/api/auth/me'),
};

// ─── CHATBOTS ─────────────────────────────────────────────────────────────────
export const chatbotsApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<PaginatedResponse<Chatbot>>(`/api/chatbots${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) => request<Chatbot>(`/api/chatbots/${id}`),

  create: (data: Partial<Chatbot>) =>
    request<Chatbot>('/api/chatbots', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Chatbot>) =>
    request<Chatbot>(`/api/chatbots/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request(`/api/chatbots/${id}`, { method: 'DELETE' }),

  getEmbedCode: (id: string) =>
    request<{ embedCode: string; chatbotId: string }>(`/api/chatbots/${id}/embed-code`),

  getAnalytics: (id: string, days = 30) =>
    request<ChatbotAnalytics>(`/api/chatbots/${id}/analytics?days=${days}`),

  getConversations: (id: string, params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<PaginatedResponse<Conversation>>(`/api/chatbots/${id}/conversations${qs ? `?${qs}` : ''}`);
  },

  getLeads: (id: string, params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<PaginatedResponse<Lead>>(`/api/chatbots/${id}/leads${qs ? `?${qs}` : ''}`);
  },
};

// ─── BILLING ─────────────────────────────────────────────────────────────────
export const billingApi = {
  getPlans: () => request<{ plans: Plan[] }>('/api/billing/plans'),
  getUsage: () => request<UsageSummary>('/api/billing/usage'),
  getInvoices: () => request<Invoice[]>('/api/billing/invoices'),
  createCheckout: (priceId: string) =>
    request<{ url: string }>('/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ priceId }),
    }),
  createPortal: () =>
    request<{ url: string }>('/api/billing/portal', { method: 'POST' }),
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats: () => request<DashboardStats>('/api/dashboard/stats'),
};

// ─── API KEYS ─────────────────────────────────────────────────────────────────
export const apiKeysApi = {
  list: () => request<ApiKey[]>('/api/api-keys'),
  create: (name: string) =>
    request<ApiKey & { key: string }>('/api/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  delete: (id: string) =>
    request(`/api/api-keys/${id}`, { method: 'DELETE' }),
};

// ─── TYPES ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
  lastLoginAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  subscriptionStatus: string;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  messageCount: number;
  chatbotCount: number;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Chatbot {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  model: string;
  aiProvider: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  widgetConfig: WidgetConfig;
  allowedDomains: string[];
  leadCaptureEnabled: boolean;
  leadCaptureFields: LeadCaptureField[];
  totalConversations: number;
  totalMessages: number;
  avgRating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WidgetConfig {
  primaryColor: string;
  textColor: string;
  backgroundColor: string;
  position: 'bottom-right' | 'bottom-left';
  avatar?: string;
  welcomeMessage: string;
  placeholder: string;
  showBranding: boolean;
  buttonText: string;
  headerTitle: string;
}

export interface LeadCaptureField {
  name: string;
  type: 'email' | 'text' | 'phone';
  required: boolean;
  label: string;
}

export interface Conversation {
  id: string;
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  messageCount: number;
  isActive: boolean;
  rating?: number;
  pageUrl?: string;
  lead?: Lead;
  _count: { messages: number };
}

export interface Lead {
  id: string;
  data: Record<string, string>;
  createdAt: string;
}

export interface ChatbotAnalytics {
  period: string;
  conversations: number;
  messages: number;
  leads: number;
  avgRating?: number;
  conversationsByDay: Array<{ date: string; count: number }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UsageSummary {
  plan: string;
  subscriptionStatus: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string;
  usage: {
    messages: { used: number; limit: number; percentage: number };
    conversations: { used: number; limit: number; percentage: number };
    chatbots: { used: number; limit: number };
  };
  limits: Record<string, unknown>;
}

export interface DashboardStats {
  totalConversations: number;
  totalMessages: number;
  totalLeads: number;
  avgRating?: number;
  conversationsToday: number;
  messagesThisMonth: number;
  topChatbots: Array<{ id: string; name: string; conversations: number; messages: number }>;
  conversationsByDay: Array<{ date: string; count: number }>;
}

export interface Plan {
  id: string;
  name: string;
  price: { monthly: number; annual: number };
  priceId?: string;
  popular?: boolean;
  features: string[];
  limits: Record<string, unknown>;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paidAt?: string;
  invoiceUrl?: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  key?: string; // Only returned on creation
}
