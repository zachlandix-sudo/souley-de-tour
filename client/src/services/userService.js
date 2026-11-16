import api from './api';

export async function listUsers(params = {}) {
  const { data } = await api.get('/users', { params });
  return { data: data.data, pagination: data.pagination };
}
export async function updateUser(id, patch) {
  const { data } = await api.patch(`/users/${id}`, patch);
  return data.data;
}
export async function deleteUser(id) {
  await api.delete(`/users/${id}`);
}
// What this person did on the site: counts, latest reviews and trips, and whether the account is locked
export async function getUserOverview(id) {
  const { data } = await api.get(`/users/${id}/overview`);
  return data.data;
}
export async function forceLogoutUser(id) {
  const { data } = await api.post(`/users/${id}/force-logout`);
  return data.message;
}
export async function unlockUser(id) {
  const { data } = await api.post(`/users/${id}/unlock`);
  return data.message;
}
