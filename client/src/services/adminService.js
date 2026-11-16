import api from './api';

export async function getDashboard() {
  const { data } = await api.get('/admin/dashboard');
  return data.data;
}
export async function listAdminSpots(params = {}, signal) {
  const { data } = await api.get('/tourist-spots', { params: { status: 'all', ...params }, signal });
  return { data: data.data, pagination: data.pagination };
}
export async function setSpotStatus(id, status) {
  const { data } = await api.patch(`/tourist-spots/${id}/status`, { status });
  return data.data;
}
export async function deleteSpot(id, hard = false) {
  await api.delete(`/tourist-spots/${id}`, { params: hard ? { hard: true } : {} });
}
export async function getSpotForEdit(id) {
  const { data } = await api.get(`/tourist-spots/${id}`);
  return data.data;
}
export async function createSpot(body) {
  const { data } = await api.post('/tourist-spots', body);
  return data.data;
}
export async function updateSpot(id, body) {
  const { data } = await api.put(`/tourist-spots/${id}`, body);
  return data.data;
}
// One action on up to 100 spots at once. action: 'publish' | 'draft' | 'archive' | 'feature' | 'unfeature' | 'delete' (admin only)
export async function bulkSpots(ids, action) {
  const { data } = await api.post('/admin/spots/bulk', { ids, action });
  return data.data;
}
// What each spot still needs (missing pin, placeholder text...). { check, limit } narrow it to one check with a longer list.
export async function getHealth(params = {}, signal) {
  const { data } = await api.get('/admin/health', { params, signal });
  return data.data;
}
// Who did what, newest first (admin only). params: { type, q, page, limit }
export async function getActivity(params = {}, signal) {
  const { data } = await api.get('/admin/activity', { params, signal });
  return { data: data.data, pagination: data.pagination };
}
// A CSV file as a Blob. kind: 'spots' | 'users' | 'reviews' | 'activity'. The list's own filters can be passed in params.
export async function exportCsv(kind, params = {}) {
  try {
    const res = await api.get(`/admin/export/${kind}`, { params, responseType: 'blob' });
    return res.data;
  } catch (e) {
    // an error body also arrives as a Blob here: turn it back into the JSON the rest of the app expects
    const b = e?.response?.data;
    if (b && typeof b.text === 'function') {
      try { e.response.data = JSON.parse(await b.text()); } catch { /* not JSON: keep it as it is */ }
    }
    throw e;
  }
}
// Numbers behind the dashboard charts. range: '7d' | '30d' | '90d' | '12m'
export async function getStatistics(range = '30d', signal) {
  const { data } = await api.get('/admin/statistics', { params: { range }, signal });
  return data.data;
}
