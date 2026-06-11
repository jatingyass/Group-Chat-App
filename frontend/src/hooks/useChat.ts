import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket } from '../api/socket';
import { api } from '../api/axios';
import type { Message } from '../api/types';

export type MessageWithTier = Message & { tier?: 'warm' | 'cold' };

export interface SendPayload {
  text: string;
  attachment?: {
    fileUrl: string;
    fileName: string;
    fileMimeType: string;
    fileSize: number;
  };
}

interface ArchiveMeta {
  warmCount: number;
  coldCount: number;
}

interface UseChatResult {
  messages: MessageWithTier[];
  isConnected: boolean;
  isLoading: boolean;
  sendMessage: (payload: SendPayload) => Promise<void>;
  notifyTyping: () => void;
  typingUsers: string[];
  loadOlder: () => Promise<ArchiveMeta>;
  isLoadingOlder: boolean;
  hasMoreOlder: boolean;
}

export function useChat(groupId: number): UseChatResult {
  const [messages, setMessages] = useState<MessageWithTier[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const typingThrottle = useRef<number>(0);

  // Load hot tier on mount
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setHasMoreOlder(true);
    api
      .get(`/api/messages/${groupId}?limit=100`)
      .then((res) => {
        if (!cancelled) setMessages(res.data.data as MessageWithTier[]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    const onConnect = () => {
      setIsConnected(true);
      socket.emit('join-group', groupId, (resp: { ok: boolean; error?: string }) => {
        if (!resp?.ok) console.error('join-group failed:', resp?.error);
      });
    };
    const onDisconnect = () => setIsConnected(false);
    const onMessage = (msg: Message) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    };
    const onTyping = ({ userName }: { userName: string }) => {
      setTypingUsers((prev) => (prev.includes(userName) ? prev : [...prev, userName]));
      const existing = typingTimers.current.get(userName);
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u !== userName));
        typingTimers.current.delete(userName);
      }, 2_500);
      typingTimers.current.set(userName, t);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('receive-message', onMessage);
    socket.on('typing', onTyping);

    if (socket.connected) onConnect();

    return () => {
      socket.emit('leave-group', groupId, () => {});
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('receive-message', onMessage);
      socket.off('typing', onTyping);
      typingTimers.current.forEach((t) => clearTimeout(t));
      typingTimers.current.clear();
    };
  }, [groupId]);

  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  const sendMessage = useCallback(
    async ({ text, attachment }: SendPayload) => {
      const socket = socketRef.current;
      if (!socket) return;
      const payload: Record<string, unknown> = { groupId, message: text };
      if (attachment) {
        payload.fileUrl = attachment.fileUrl;
        payload.fileName = attachment.fileName;
        payload.fileMimeType = attachment.fileMimeType;
        payload.fileSize = attachment.fileSize;
      }
      await new Promise<void>((resolve, reject) => {
        socket.emit(
          'send-message',
          payload,
          (resp: { ok: boolean; data?: Message; error?: string }) => {
            if (resp?.ok && resp.data) {
              setMessages((prev) =>
                prev.some((m) => m.id === resp.data!.id) ? prev : [...prev, resp.data!],
              );
              resolve();
            } else {
              reject(new Error(resp?.error || 'Failed to send'));
            }
          },
        );
      });
    },
    [groupId],
  );

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - typingThrottle.current < 1_500) return;
    typingThrottle.current = now;
    socketRef.current?.emit('typing', { groupId });
  }, [groupId]);

  // Pulls older messages from the warm + cold tiers and prepends them.
  // Uses the timestamp of the oldest currently-loaded message as the cursor.
  const loadOlder = useCallback(async (): Promise<ArchiveMeta> => {
    if (isLoadingOlder || !hasMoreOlder) return { warmCount: 0, coldCount: 0 };
    setIsLoadingOlder(true);
    try {
      const oldest = messages[0];
      const before = oldest ? new Date(oldest.createdAt).getTime() : Date.now();
      const res = await api.get(`/api/messages/${groupId}/archive`, {
        params: { before, limit: 50 },
      });
      const older = res.data.data as MessageWithTier[];
      const meta: ArchiveMeta = res.data.meta || { warmCount: 0, coldCount: 0 };

      if (older.length === 0) {
        setHasMoreOlder(false);
      } else {
        // Dedup against current set just in case
        setMessages((prev) => {
          const existing = new Set(prev.map((m) => m.id));
          const fresh = older.filter((m) => !existing.has(m.id));
          return [...fresh, ...prev];
        });
      }
      return meta;
    } finally {
      setIsLoadingOlder(false);
    }
  }, [groupId, messages, isLoadingOlder, hasMoreOlder]);

  return {
    messages,
    isConnected,
    isLoading,
    sendMessage,
    notifyTyping,
    typingUsers,
    loadOlder,
    isLoadingOlder,
    hasMoreOlder,
  };
}
