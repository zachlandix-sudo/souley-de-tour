import api from './api';

export async function listAllReviews(params = {}) {
  const { data } = await api.get('/reviews', { params });
  return { data: data.data, pagination: data.pagination, counts: data.counts };
}
export async function setReviewStatus(id, status) {
  const { data } = await api.patch(`/reviews/${id}/status`, { status });
  return data.data;
}
export async function deleteReview(id) {
  await api.delete(`/reviews/${id}`);
}
// One action on up to 100 reviews. action: 'approve' | 'reject' | 'pending' | 'delete'
export async function bulkReviews(ids, action) {
  const { data } = await api.post('/admin/reviews/bulk', { ids, action });
  return data.data;
}
