import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { api, extractError } from '../api/axios';
import type { Group } from '../api/types';

interface Props {
  onClose: () => void;
  onCreated: (group: Group) => void;
}

export default function CreateGroupModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post('/api/groups', { name });
      onCreated(res.data.data as Group);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="card w-full max-w-md p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Create new group</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="group-name">Group name</label>
            <input
              id="group-name"
              required
              minLength={2}
              maxLength={80}
              autoFocus
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. IIIT Lucknow Batch '26"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Creating...' : 'Create group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
