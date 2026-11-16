import api from './api';

export async function listTrips() {
  const { data } = await api.get('/itineraries');
  return data.data || [];
}
// Populated: each item's touristSpotId is { name, slug, municipality, ... }.
export async function getTrip(id) {
  const { data } = await api.get(`/itineraries/${id}`);
  return data.data;
}
export async function createTrip(trip) {
  const { data } = await api.post('/itineraries', trip);
  return data.data;
}
export async function removeTrip(id) {
  await api.delete(`/itineraries/${id}`);
}
