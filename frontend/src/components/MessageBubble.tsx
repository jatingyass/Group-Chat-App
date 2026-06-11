import clsx from 'clsx';
import type { Message } from '../api/types';
import { classifyMime, formatBytes } from '../api/files';

type MessageWithTier = Message & { tier?: 'warm' | 'cold' };

interface Props {
  message: MessageWithTier;
  isMine: boolean;
  showSender: boolean;
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const Attachment = ({ message, isMine }: { message: Message; isMine: boolean }) => {
  if (!message.fileUrl) return null;
  const kind = classifyMime(message.fileMimeType);
  const fileName = message.fileName || 'attachment';

  if (kind === 'image') {
    return (
      <a href={message.fileUrl} target="_blank" rel="noreferrer" className="block">
        <img
          src={message.fileUrl}
          alt={fileName}
          className="max-h-72 max-w-full rounded-lg object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  if (kind === 'video') {
    return (
      <video controls preload="metadata" className="max-h-80 max-w-full rounded-lg bg-black">
        <source src={message.fileUrl} type={message.fileMimeType || undefined} />
        Your browser does not support video.
      </video>
    );
  }

  if (kind === 'audio') {
    return (
      <audio controls preload="metadata" className="w-full">
        <source src={message.fileUrl} type={message.fileMimeType || undefined} />
      </audio>
    );
  }

  const badge =
    kind === 'pdf' ? 'PDF' : kind === 'archive' ? 'ZIP' : kind === 'doc' ? 'DOC' : 'FILE';
  const badgeColor =
    kind === 'pdf' ? 'bg-rose-500' :
    kind === 'archive' ? 'bg-amber-500' :
    kind === 'doc' ? 'bg-sky-500' : 'bg-slate-500';

  return (
    <a
      href={message.fileUrl}
      target="_blank"
      rel="noreferrer"
      className={clsx(
        'flex items-center gap-3 rounded-lg border p-2 transition hover:shadow',
        isMine ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-slate-50',
      )}
    >
      <div className={clsx('flex h-10 w-10 items-center justify-center rounded text-[10px] font-bold uppercase text-white', badgeColor)}>
        {badge}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-slate-900">{fileName}</div>
        <div className="text-[10px] text-slate-500">{formatBytes(message.fileSize)}</div>
      </div>
    </a>
  );
};

const TierBadge = ({ tier }: { tier?: 'warm' | 'cold' }) => {
  if (!tier) return null;
  return (
    <span
      className={clsx(
        'rounded-full px-1.5 py-0.5 text-[9px] font-medium',
        tier === 'cold' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700',
      )}
      title={tier === 'cold' ? 'Cold storage (>30 days old)' : 'Warm archive (1-30 days old)'}
    >
      {tier}
    </span>
  );
};

export default function MessageBubble({ message, isMine, showSender }: Props) {
  const hasAttachment = Boolean(message.fileUrl);
  const hasText = message.message && message.message.length > 0;

  return (
    <div className={clsx('flex w-full', isMine ? 'justify-end' : 'justify-start')}>
      <div className={clsx('max-w-[75%] flex flex-col', isMine ? 'items-end' : 'items-start')}>
        {showSender && !isMine && (
          <div className="mb-1 px-1 text-xs font-medium text-slate-500">{message.userName}</div>
        )}
        <div
          className={clsx(
            'rounded-2xl px-3 py-2 text-sm shadow-sm',
            isMine
              ? 'bg-brand-500 text-white rounded-br-sm'
              : 'bg-white text-slate-800 rounded-bl-sm border border-slate-200',
          )}
        >
          {hasAttachment && (
            <div className={clsx(hasText && 'mb-2')}>
              <Attachment message={message} isMine={isMine} />
            </div>
          )}
          {hasText && <p className="whitespace-pre-wrap break-words">{message.message}</p>}
        </div>
        <div className="mt-1 flex items-center gap-1 px-1 text-[10px] text-slate-400">
          <span>{formatTime(message.createdAt)}</span>
          <TierBadge tier={message.tier} />
        </div>
      </div>
    </div>
  );
}
