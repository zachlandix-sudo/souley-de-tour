import api from './api';

// Leyte Passport on the account. A stamp is { spot, at, method, name, municipality, slug }.
export async function listStamps() {
  const { data } = await api.get('/users/me/passport/stamps');
  return data.data?.stamps || [];
}
// Moves stamps collected as a guest into the account (safe to repeat). Returns the account's full list.
export async function mergeStamps(stamps) {
  const { data } = await api.put('/users/me/passport/stamps', { stamps });
  return data.data?.stamps || [];
}
export async function addStamp(spotId, { method, at }) {
  await api.post(`/users/me/passport/stamps/${spotId}`, { method, at });
}
export async function removeStamp(spotId) {
  await api.delete(`/users/me/passport/stamps/${spotId}`);
}
// Home town and cover colour. Returns { homeTown, color }.
export async function saveProfile(values) {
  const { data } = await api.patch('/users/me/passport', values);
  return data.data;
}
