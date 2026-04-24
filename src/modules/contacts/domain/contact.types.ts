export type ContactStatus = 'active' | 'archived';

export interface Contact {
  id: string;
  userId: string;
  fullName: string;
  documentId: string | null;
  phone: string | null;
  notes: string | null;
  status: ContactStatus;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface CreateContactRecord {
  userId: string;
  fullName: string;
  documentId?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export interface ContactListFilters {
  status?: ContactStatus;
  search?: string;
  page: number;
  pageSize: number;
}

export interface ContactListResult {
  items: Contact[];
  total: number;
}
