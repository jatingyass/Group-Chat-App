import { api } from './axios';
import type { UploadHandle } from './types';

const baseURL = import.meta.env.VITE_API_URL || '';

// Resolves a server-relative URL ("/uploads/..." or "/api/files/upload?...")
// against the API base so the browser PUTs to the right host.
const absolutize = (url: string) =>
  url.startsWith('http') ? url : `${baseURL.replace(/\/$/, '')}${url}`;

export async function getUploadHandle(file: File): Promise<UploadHandle> {
  const res = await api.get<{ success: true; data: UploadHandle }>(
    '/api/files/get-presigned-url',
    {
      params: {
        filename: file.name,
        filetype: file.type || 'application/octet-stream',
        filesize: file.size,
      },
    },
  );
  return res.data.data;
}

export interface UploadResult {
  fileUrl: string;       // resolvable URL to display the file
  fileName: string;
  fileMimeType: string;
  fileSize: number;
}

export interface UploadOptions {
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
}

// Uploads via XHR (so we can hook progress events). Works with both the local
// driver (PUT to /api/files/upload?key=...) and the S3 driver (PUT to a
// presigned URL). Token is auto-attached when going through the local driver.
export function uploadFile(file: File, opts: UploadOptions = {}): Promise<UploadResult> {
  return new Promise(async (resolve, reject) => {
    let handle: UploadHandle;
    try {
      handle = await getUploadHandle(file);
    } catch (err) {
      return reject(err);
    }

    const xhr = new XMLHttpRequest();
    const target = absolutize(handle.url);
    const isLocal = handle.url.startsWith('/api/files/upload');
    xhr.open(handle.method, target, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    if (isLocal) {
      const token = localStorage.getItem('gca_token');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts.onProgress) {
        opts.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const fileUrl = absolutize(handle.fileUrl);
        resolve({
          fileUrl,
          fileName: file.name,
          fileMimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
        });
      } else {
        let msg = `Upload failed (${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (body?.message) msg = body.message;
        } catch { /* ignore */ }
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'));

    if (opts.signal) {
      opts.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.send(file);
  });
}

// Categorize a mime type for rendering decisions on the frontend.
export type AttachmentKind = 'image' | 'video' | 'audio' | 'pdf' | 'doc' | 'archive' | 'other';

export const classifyMime = (mime?: string | null): AttachmentKind => {
  if (!mime) return 'other';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'application/zip' || mime === 'application/x-zip-compressed') return 'archive';
  if (
    mime === 'application/msword' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/vnd.ms-excel' ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'text/plain'
  ) {
    return 'doc';
  }
  return 'other';
};

export const formatBytes = (n?: number | null): string => {
  if (!n || n <= 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
};
