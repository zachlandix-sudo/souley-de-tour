import api from './api';

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  return data.data;
}
export async function register({ fullName, email, password, confirmPassword }) {
  const { data } = await api.post('/auth/register', { fullName, email, password, confirmPassword });
  return data.data;
}
export async function logout() {
  await api.post('/auth/logout');
}
// 401 means "not logged in", not an error.
export async function me() {
  try {
    const { data } = await api.get('/auth/me');
    return data.data;
  } catch (e) {
    if (e.response?.status === 401) return null;
    throw e;
  }
}
export async function changePassword({ currentPassword, newPassword, confirmPassword }) {
  const { data } = await api.patch('/auth/password', { currentPassword, newPassword, confirmPassword });
  return data.data;
}
export async function logoutAll() {
  await api.post('/auth/logout-all');
}
