export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Group {
  id: number;
  name: string;
  createdAt: string;
  GroupMembers?: { is_admin: boolean }[];
}

export interface Member {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  joinedAt: string;
}

export interface Message {
  id: number;
  userId: number;
  userName: string;
  groupId: number;
  message: string;
  fileUrl: string | null;
  fileName?: string | null;
  fileMimeType?: string | null;
  fileSize?: number | null;
  createdAt: string;
}

export interface UploadHandle {
  url: string;          // where the client PUTs the bytes
  fileUrl: string;      // public URL the file will live at
  key: string;          // storage key
  method: 'PUT';
  maxBytes: number;     // server-enforced cap for this mime type
}

export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  details?: { field: string; message: string }[];
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
