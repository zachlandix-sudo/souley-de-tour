// Plain-text version of a saved trip, for sharing by message or email.
// `trip.days[].items[].touristSpotId` may be a populated spot object or a bare id. `origin` is e.g. window.location.origin.
export function tripToText(trip, origin = '') {
  const lines = [trip.title || 'My Southern Leyte trip', 'Planned with SOULEY de Tour', ''];
  (trip.days || []).forEach((d) => {
    lines.push(`Day ${d.dayNumber}`);
    [...(d.items || [])].sort((a, b) => (a.visitOrder || 0) - (b.visitOrder || 0)).forEach((it, i) => {
      const s = it.touristSpotId && typeof it.touristSpotId === 'object' ? it.touristSpotId : null;
      const name = s?.name || 'Stop';
      const where = s?.municipality ? ` (${s.municipality})` : '';
      const note = it.notes ? ` - ${it.notes}` : '';
      lines.push(`${i + 1}. ${name}${where}${note}`);
      if (s?.slug && origin) lines.push(`   ${origin}/spots/${s.slug}`);
    });
    lines.push('');
  });
  if (trip.notes) lines.push(trip.notes);
  return lines.join('\n').trim();
}

// AI itinerary reply -> body for POST /itineraries.
export function tripFromAi(question, days) {
  const title = (question || '').trim().replace(/\s+/g, ' ').slice(0, 150) || 'My Southern Leyte trip';
  return {
    title,
    generatedByAI: true,
    days: (days || []).map((d) => ({
      dayNumber: d.dayNumber,
      items: (d.items || []).map((it) => ({ touristSpotId: it.touristSpotId, visitOrder: it.visitOrder, notes: it.notes })),
    })),
  };
}
