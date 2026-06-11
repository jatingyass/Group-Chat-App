import { FormEvent, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { uploadFile } from '../api/files';
import AttachmentPreview from './AttachmentPreview';
import type { SendPayload } from '../hooks/useChat';

interface Props {
  onSend: (payload: SendPayload) => Promise<void> | void;
  onTyping?: () => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, onTyping, disabled }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setText('');
    setFile(null);
    setProgress(0);
    setIsUploading(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if ((!trimmed && !file) || busy) return;
    if (trimmed.length > 2000) {
      toast.error('Message exceeds 2000 chars');
      return;
    }

    setBusy(true);
    try {
      let attachment: SendPayload['attachment'];
      if (file) {
        setIsUploading(true);
        setProgress(0);
        const result = await uploadFile(file, { onProgress: setProgress });
        attachment = result;
      }
      await onSend({ text: trimmed, attachment });
      reset();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to send');
    } finally {
      setBusy(false);
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2 border-t border-slate-200 bg-white p-3">
      {file && (
        <AttachmentPreview
          file={file}
          progress={progress}
          isUploading={isUploading}
          onClear={() => setFile(null)}
        />
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn-ghost p-2"
          title="Attach a file"
          disabled={disabled || busy}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.93 8.83l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setFile(f);
            e.target.value = ''; // allow re-selecting the same file later
          }}
        />

        <textarea
          rows={1}
          maxLength={2000}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping?.();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit(e as unknown as FormEvent);
            }
          }}
          placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
          className="input flex-1 resize-none py-2 leading-tight"
          disabled={disabled || busy}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={disabled || busy || (!text.trim() && !file)}
        >
          {isUploading ? `${progress}%` : busy ? '...' : 'Send'}
        </button>
      </div>

      <div className="flex justify-end text-[10px] text-slate-400">
        {text.length}/2000
      </div>
    </form>
  );
}
