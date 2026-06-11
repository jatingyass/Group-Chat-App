import { api } from './axios';
import type { Member } from './types';

export const groupsApi = {
  list: () => api.get('/api/groups').then((r) => r.data.data),
  create: (name: string, members?: number[]) =>
    api.post('/api/groups', { name, members }).then((r) => r.data.data),
  members: (groupId: number) =>
    api.get<{ success: true; data: Member[] }>(`/api/groups/${groupId}/members`).then((r) => r.data.data),
  invite: (groupId: number, email: string) =>
    api.post(`/api/groups/${groupId}/invite`, { email }).then((r) => r.data),
  promote: (groupId: number, userNameToPromote: string) =>
    api.post(`/api/groups/${groupId}/promote`, { userNameToPromote }).then((r) => r.data),
  remove: (groupId: number, userEmailToRemove: string) =>
    api.post(`/api/groups/${groupId}/remove`, { userEmailToRemove }).then((r) => r.data),
  leave: (groupId: number) => api.post(`/api/groups/${groupId}/leave`).then((r) => r.data),
};
