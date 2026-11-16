import { renderHook, act } from '@testing-library/react';
import { useSelection } from './useSelection';

describe('useSelection', () => {
  it('toggles single rows and counts them', () => {
    const { result } = renderHook(() => useSelection(['a', 'b', 'c']));
    act(() => result.current.toggle('a'));
    act(() => result.current.toggle('c'));
    expect(result.current.ids).toEqual(['a', 'c']);
    expect(result.current.count).toBe(2);
    expect(result.current.some).toBe(true);
    expect(result.current.allOn).toBe(false);
    act(() => result.current.toggle('a'));
    expect(result.current.has('a')).toBe(false);
  });
  it('select-all ticks everything on the page, and again clears it', () => {
    const { result } = renderHook(() => useSelection(['a', 'b']));
    act(() => result.current.toggleAll());
    expect(result.current.allOn).toBe(true);
    expect(result.current.some).toBe(false);
    act(() => result.current.toggleAll());
    expect(result.current.count).toBe(0);
  });
  it('forgets rows that are no longer on screen', () => {
    const { result, rerender } = renderHook(({ ids }) => useSelection(ids), { initialProps: { ids: ['a', 'b', 'c'] } });
    act(() => result.current.toggleAll());
    rerender({ ids: ['c', 'd'] });
    expect(result.current.ids).toEqual(['c']);
  });
  it('an empty page is never "all selected"', () => {
    const { result } = renderHook(() => useSelection([]));
    expect(result.current.allOn).toBe(false);
  });
  it('Clear empties the selection', () => {
    const { result } = renderHook(() => useSelection(['a']));
    act(() => result.current.toggle('a'));
    act(() => result.current.clear());
    expect(result.current.count).toBe(0);
  });
});
