export type UserStatus = 'active' | 'deleted';

export interface UserProfileView {
  id: string;
  fullName: string;
  email: string;
  status: UserStatus;
  createdAt: Date;
}

export interface UserAccountDeletionView {
  status: 'deleted';
}

export interface UserExportJsonView {
  user: UserProfileView & {
    deletedAt: Date | null;
    updatedAt: Date;
  };
  contacts: Array<Record<string, unknown>>;
  loans: Array<Record<string, unknown>>;
  installments: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
}

export interface UserExportFileView {
  format: 'json' | 'csv';
  fileName: string;
  contentType: string;
  content: string;
}
