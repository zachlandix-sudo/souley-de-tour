import api from './api';

// Everything the signed-in visitor has done on the site, for the /journey page:
// { memberSince, counts: { favorites, reviews, pendingReviews, trips, asks }, reviewedSpotIds, reviews, trips, asks }
export async function getMyOverview() {
  const { data } = await api.get('/users/me/overview');
  return data.data;
}
