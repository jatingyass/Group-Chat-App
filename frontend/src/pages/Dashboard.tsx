import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, extractError } from '../api/axios';
import type { Group } from '../api/types';
import { useAuth } from '../context/AuthContext';
import CreateGroupModal from '../components/CreateGroupModal';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/groups');
      setGroups(res.data.data);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const onCreated = (group: Group) => {
    setGroups((prev) => [group, ...prev]);
    setShowCreate(false);
    toast.success('Group created');
  };

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Your groups</h1>
          <p className="text-sm text-slate-600">Hi {user?.name}, jump back into a conversation.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={() => setShowCreate(true)}>+ New group</button>
          <button className="btn-ghost" onClick={() => { logout(); navigate('/login'); }}>
            Sign out
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="card p-12 text-center text-slate-500">Loading...</div>
      ) : groups.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-700">You aren't in any groups yet.</p>
          <p className="mt-1 text-sm text-slate-500">Create your first group to start chatting.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {groups.map((g) => {
            const isAdmin = g.GroupMembers?.[0]?.is_admin;
            return (
              <li key={g.id}>
                <button
                  onClick={() => navigate(`/chat/${g.id}`)}
                  className="card flex w-full items-center justify-between p-4 text-left transition hover:border-brand-500 hover:shadow"
                >
                  <div>
                    <div className="font-medium text-slate-900">{g.name}</div>
                    <div className="text-xs text-slate-500">
                      Created {new Date(g.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {isAdmin && (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      admin
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {showCreate && (
        <CreateGroupModal onClose={() => setShowCreate(false)} onCreated={onCreated} />
      )}
    </div>
  );
}
