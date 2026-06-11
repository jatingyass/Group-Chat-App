import { classifyMime, formatBytes } from '../api/files';
import clsx from 'clsx';

interface Props {
  file: File;
  progress?: number;
  onClear: () => void;
  isUploading: boolean;
}

export default function AttachmentPreview({ file, progress = 0, onClear, isUploading }: Props) {
  const kind = classifyMime(file.type);
  const objectUrl = URL.createObjectURL(file);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm">
      {kind === 'image' ? (
        <img src={objectUrl} alt={file.name} className="h-12 w-12 rounded object-cover" />
      ) : (
        <div
          className={clsx(
            'flex h-12 w-12 items-center justify-center rounded text-xs font-medium uppercase text-white',
            kind === 'video' && 'bg-purple-500',
            kind === 'audio' && 'bg-emerald-500',
            kind === 'pdf' && 'bg-rose-500',
            kind === 'doc' && 'bg-sky-500',
            kind === 'archive' && 'bg-amber-500',
            kind === 'other' && 'bg-slate-500',
          )}
        >
          {kind === 'video' ? 'VID' : kind === 'audio' ? 'AUD' : kind === 'pdf' ? 'PDF' : kind === 'doc' ? 'DOC' : 'FILE'}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-slate-900">{file.name}</div>
        <div className="text-xs text-slate-500">{formatBytes(file.size)}</div>
        {isUploading && (
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-slate-200">
            <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onClear}
        className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
        title="Remove attachment"
      >
        ✕
      </button>
    </div>
  );
}
