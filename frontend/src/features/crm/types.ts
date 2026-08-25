export interface Lead {
  id: string;
  name: string;
  phone: string;
  company: string | null;
  leadStatus: string;
  kanbanStage: string;
  score: number;
  interests: string[];
  objections: string[];
  tags: string[];
  lastInteraction: string | null;
  hoursSinceLastContact: number | null;
  conversationCount: number;
  interactionCount: number;
  activeFunnelId: string | null;
  activeFunnelStep: string | null;
  pendingTasks: number;
  lastMessageContent: string | null;
  lastMessageDirection: string | null;
}

export type LeadListItem = Lead;

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | string;
  dueDate?: string | null;
  createdAt: string;
}

export interface Message {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND' | string;
  content: string;
  role?: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  status: string;
  messageCount: number;
  activeFunnel: { funnelId: string; step: string } | null;
  messages: Message[];
}

export interface LeadDetail {
  id: string;
  name: string;
  phone: string;
  company: string | null;
  leadStatus: string;
  score: number;
  interests: string[];
  objections: string[];
  tags: string[];
  lastInteraction: string | null;
  conversations: Conversation[];
  tasks: Task[];
}

export interface LeadsResponse {
  total: number;
  page: number;
  kanban: Record<string, Lead[]>;
}

export const KANBAN_STAGES = [
  'Nuevo',
  'Contactado',
  'Interesado',
  'Demo',
  'Oferta',
  'Venta',
  'Cliente',
] as const;

export type KanbanStage = typeof KANBAN_STAGES[number];
