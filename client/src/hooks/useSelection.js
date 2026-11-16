import { useCallback, useEffect, useMemo, useState } from 'react';

// Ticked rows in an admin list. Only rows that are on screen stay ticked: change page, filter or reload and the others are forgotten,
// so a bulk action can never hit something the person can no longer see.
export function useSelection(visibleIds) {
  const [picked, setPicked] = useState(() => new Set());
  const key = visibleIds.join('|');

  useEffect(() => {
    setPicked((prev) => {
      if (prev.size === 0) return prev;
      const keep = new Set([...prev].filter((id) => visibleIds.includes(id)));
      return keep.size === prev.size ? prev : keep;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const toggle = useCallback((id) => setPicked((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }), []);
  const clear = useCallback(() => setPicked(new Set()), []);
  const allOn = visibleIds.length > 0 && visibleIds.every((id) => picked.has(id));
  const some = !allOn && visibleIds.some((id) => picked.has(id));
  const toggleAll = useCallback(() => setPicked(allOn ? new Set() : new Set(visibleIds)), [allOn, key]); // eslint-disable-line react-hooks/exhaustive-deps
  const ids = useMemo(() => [...picked], [picked]);
  return { ids, count: picked.size, has: (id) => picked.has(id), toggle, toggleAll, clear, allOn, some };
}

export default useSelection;
