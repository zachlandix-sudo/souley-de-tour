import api from './api';

// mode: 'recommend' | 'itinerary'
export async function askAi(mode, payload) {
  const path = mode === 'itinerary' ? '/ai/itinerary' : '/ai/recommendations';
  const { data } = await api.post(path, payload);
  return data.data; // { answer, recommendations:[{spotId, reason, spot}], days:[{dayNumber, items}], aiUsed }
}
