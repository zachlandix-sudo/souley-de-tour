import api from './api';

export async function listCategories(params = {}, signal) {
  const { data } = await api.get('/categories', { params, signal });
  return data.data;
}
export async function createCategory(body) {
  const { data } = await api.post('/categories', body);
  return data.data;
}
export async function updateCategory(id, patch) {
  const { data } = await api.put(`/categories/${id}`, patch);
  return data.data;
}
export async function deleteCategory(id) {
  await api.delete(`/categories/${id}`);
}
