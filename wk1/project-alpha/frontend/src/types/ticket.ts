import { Tag } from './tag';

export type TicketStatus = 'open' | 'in_progress' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high';

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  tags: Tag[];
  created_at: string;
  updated_at: string;
}

export interface TicketCreate {
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  tag_ids: number[];
}

export interface TicketUpdate {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  tag_ids?: number[];
}

export interface TicketFilter {
  status?: TicketStatus;
  priority?: TicketPriority;
  tag_id?: number;
}
