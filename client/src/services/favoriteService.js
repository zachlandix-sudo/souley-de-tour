import api from './api';

export async function listFavorites() {
  const { data } = await api.get('/users/me/favorites');
  return data.data || [];
}
export async function addFavorite(spotId) {
  await api.post(`/users/me/favorites/${spotId}`);
}
export async function removeFavorite(spotId) {
  await api.delete(`/users/me/favorites/${spotId}`);
}
