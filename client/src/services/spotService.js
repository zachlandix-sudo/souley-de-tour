import api from './api';

export async function listSpots(params = {}, signal) {
  const { data } = await api.get('/tourist-spots', { params, signal });
  return { data: data.data, pagination: data.pagination };
}

export async function getSpot(slug, signal) {
  const { data } = await api.get(`/tourist-spots/${encodeURIComponent(slug)}`, { signal });
  return data.data;
}

export async function listReviews(spotId, params = {}) {
  const { data } = await api.get(`/tourist-spots/${spotId}/reviews`, { params });
  return { data: data.data, pagination: data.pagination };
}

export async function createReview(spotId, payload) {
  const { data } = await api.post(`/tourist-spots/${spotId}/reviews`, payload);
  return { review: data.data, message: data.message };
}
