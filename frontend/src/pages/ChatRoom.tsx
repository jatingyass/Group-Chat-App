import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../hooks/useChat';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import GroupMembersDrawer from '../components/GroupMembersDrawer';

export default function ChatRoom() {
  const { groupId: groupIdParam } = useParams<{ groupId: string }>();
  const groupId = Number(groupIdParam);
  const { user } = useAuth();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showMembers, setShowMembers] = useState(false);

  const {
    messages,
    isConnected,
    isLoading,
    sendMessage,
    notifyTyping,
    typingUsers,
    loadOlder,
    isLoadingOlder,
    hasMoreOlder,
  } = useChat(groupId);

  // Auto-scroll to bottom when new messages arrive — but NOT when older
  // messages are prepended (the user is reading history in that case).
  const lastIdRef = useRef<number | null>(null);
  useEffect(() => {
    const lastId = messages[messages.length - 1]?.id ?? null;
    if (lastId !== lastIdRef.current && !isLoadingOlder) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      lastIdRef.current = lastId;
    }
  }, [messages, isLoadingOlder]);

  if (!Number.isInteger(groupId) || groupId <= 0) {
    return <div className="p-8 text-center text-slate-600">Invalid group.</div>;
  }

  const handleLoadOlder = async () => {
    try {
      const meta = await loadOlder();
      const total = meta.warmCount + meta.coldCount;
      if (total === 0) {
        toast('No older messages to load', { icon: '📭' });
      } else {
        toast.success(
          `Loaded ${total} older — ${meta.warmCount} warm, ${meta.coldCount} cold`,
        );
      }
    } catch (err) {
      toast.error((err as Error).message || 'Failed to load older messages');
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="btn-ghost px-2 py-1 text-sm">← Back</Link>
          <div>
            <div className="font-medium text-slate-900">Group #{groupId}</div>
            <div className="text-xs text-slate-500">
              {isConnected ? (
                <span className="text-emerald-600">● Connected</span>
              ) : (
                <span className="text-amber-600">● Connecting...</span>
              )}
            </div>
          </div>
        </div>
        <button className="btn-ghost text-sm" onClick={() => setShowMembers(true)}>
          Members
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-4">
        {hasMoreOlder && messages.length > 0 && (
          <div className="flex justify-center pb-2">
            <button
              className="btn-ghost text-xs text-brand-700 hover:bg-brand-50 disabled:opacity-50"
              onClick={handleLoadOlder}
              disabled={isLoadingOlder}
            >
              {isLoadingOlder ? 'Loading older...' : '↑ Load older messages (warm + cold archive)'}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center text-sm text-slate-500">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="mt-12 text-center text-sm text-slate-500">
            No messages yet. Be the first to say hi.
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const showSender = !prev || prev.userId !== m.userId;
            return (
              <MessageBubble
                key={m.id}
                message={m}
                isMine={m.userId === user?.id}
                showSender={showSender}
              />
            );
          })
        )}
        {typingUsers.length > 0 && (
          <div className="px-1 text-xs italic text-slate-500">
            {typingUsers.join(', ')} typing...
          </div>
        )}
      </div>

      <MessageInput
        onSend={async (payload) => {
          try {
            await sendMessage(payload);
          } catch (err) {
            toast.error((err as Error).message);
          }
        }}
        onTyping={notifyTyping}
        disabled={!isConnected}
      />

      {showMembers && (
        <GroupMembersDrawer
          groupId={groupId}
          onClose={() => setShowMembers(false)}
          onLeft={() => navigate('/')}
        />
      )}
    </div>
  );
}
