export type ContactStatus = 'active' | 'archived';

export interface ContactView {
  id: string;
  fullName: string;
  documentId: string | null;
  phone: string | null;
  notes: string | null;
  status: ContactStatus;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export type ContactListItemView = ContactView;

export interface ContactListView {
  items: ContactListItemView[];
  page: number;
  pageSize: number;
  total: number;
}
