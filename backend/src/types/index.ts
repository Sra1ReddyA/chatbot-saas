import type { Request } from 'express';
import type { Plan } from '@prisma/client';

export interface AuthPayload {
  userId: string;
  organizationId: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthPayload;
  organizationId?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
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

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

export interface WidgetConfig {
  primaryColor: string;
  textColor: string;
  backgroundColor: string;
  position: 'bottom-right' | 'bottom-left';
  avatar: string | null;
  welcomeMessage: string;
  placeholder: string;
  showBranding: boolean;
  buttonText: string;
  headerTitle: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LeadCaptureField {
  name: string;
  type: 'email' | 'text' | 'phone';
  required: boolean;
  label: string;
}

export interface UsageSummary {
  plan: Plan;
  messages: {
    used: number;
    limit: number;
    percentage: number;
  };
  conversations: {
    used: number;
    limit: number;
    percentage: number;
  };
  chatbots: {
    used: number;
    limit: number;
  };
}

export interface DashboardStats {
  totalConversations: number;
  totalMessages: number;
  totalLeads: number;
  avgRating: number;
  conversationsToday: number;
  messagesThisMonth: number;
  topChatbots: Array<{
    id: string;
    name: string;
    conversations: number;
    messages: number;
  }>;
  conversationsByDay: Array<{
    date: string;
    count: number;
  }>;
}
