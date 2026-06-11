import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { groupsApi } from '../api/groups';
import { extractError } from '../api/axios';

interface Props {
  groupId: number;
  onClose: () => void;
  onInvited: () => void;
}

export default function InviteMemberDialog({ groupId, onClose, onInvited }: Props) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await groupsApi.invite(groupId, email);
      toast.success('User invited');
      onInvited();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Invite member</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="invite-email">User's email</label>
            <input
              id="invite-email"
              type="email"
              required
              autoFocus
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
            <p className="mt-1 text-xs text-slate-500">
              The user must already have an account on this app.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy || !email.trim()}>
              {busy ? 'Inviting...' : 'Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
