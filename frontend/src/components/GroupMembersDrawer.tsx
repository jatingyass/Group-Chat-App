import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { groupsApi } from '../api/groups';
import { extractError } from '../api/axios';
import type { Member } from '../api/types';
import { useAuth } from '../context/AuthContext';
import InviteMemberDialog from './InviteMemberDialog';

interface Props {
  groupId: number;
  onClose: () => void;
  onLeft?: () => void;
}

export default function GroupMembersDrawer({ groupId, onClose, onLeft }: Props) {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const me = members.find((m) => m.id === user?.id);
  const iAmAdmin = Boolean(me?.isAdmin);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await groupsApi.members(groupId);
      setMembers(data);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [groupId]);

  const onPromote = async (m: Member) => {
    try {
      await groupsApi.promote(groupId, m.name);
      toast.success(`${m.name} is now an admin`);
      await load();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const onRemove = async (m: Member) => {
    if (!confirm(`Remove ${m.name} from the group?`)) return;
    try {
      await groupsApi.remove(groupId, m.email);
      toast.success(`${m.name} removed`);
      await load();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const onLeave = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;
    try {
      await groupsApi.leave(groupId);
      toast.success('You left the group');
      onLeft?.();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-slate-900/40" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-sm flex-col bg-white shadow-xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="font-semibold text-slate-900">Members</h2>
            <p className="text-xs text-slate-500">{members.length} in this group</p>
          </div>
          <div className="flex gap-2">
            {iAmAdmin && (
              <button className="btn-primary px-3 py-1 text-xs" onClick={() => setShowInvite(true)}>
                + Invite
              </button>
            )}
            <button className="btn-ghost px-2 py-1 text-sm" onClick={onClose}>✕</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-slate-500">Loading...</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {members.map((m) => {
                const isMe = m.id === user?.id;
                return (
                  <li key={m.id} className="flex items-center justify-between gap-2 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-slate-900">
                          {m.name}{isMe && <span className="ml-1 text-xs text-slate-400">(you)</span>}
                        </span>
                        {m.isAdmin && (
                          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                            admin
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-slate-500">{m.email}</div>
                    </div>

                    {iAmAdmin && !isMe && (
                      <div className="flex flex-shrink-0 gap-1">
                        {!m.isAdmin && (
                          <button
                            className="rounded px-2 py-1 text-xs text-brand-700 hover:bg-brand-50"
                            onClick={() => onPromote(m)}
                          >
                            Promote
                          </button>
                        )}
                        <button
                          className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                          onClick={() => onRemove(m)}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="border-t border-slate-200 p-3">
          <button className="btn-ghost w-full text-sm text-rose-600 hover:bg-rose-50" onClick={onLeave}>
            Leave group
          </button>
        </footer>

        {showInvite && (
          <InviteMemberDialog
            groupId={groupId}
            onClose={() => setShowInvite(false)}
            onInvited={() => {
              setShowInvite(false);
              load();
            }}
          />
        )}
      </aside>
    </div>
  );
}
