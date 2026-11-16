import { act, renderHook } from '@testing-library/react';
import { useLocalList } from './useLocalList';

describe('useLocalList', () => {
  beforeEach(() => window.localStorage.clear());

  it('adds and removes an item and remembers it', () => {
    const { result } = renderHook(() => useLocalList('t:list'));
    act(() => result.current.toggle('a'));
    expect(result.current.list).toEqual(['a']);
    expect(JSON.parse(window.localStorage.getItem('t:list'))).toEqual(['a']);
    act(() => result.current.toggle('a'));
    expect(result.current.list).toEqual([]);
  });
  it('stops adding at the maximum but still removes', () => {
    const { result } = renderHook(() => useLocalList('t:max', { max: 2 }));
    act(() => { result.current.toggle('a'); result.current.toggle('b'); result.current.toggle('c'); });
    expect(result.current.list).toEqual(['a', 'b']);
    expect(result.current.full).toBe(true);
    act(() => result.current.remove('a'));
    expect(result.current.list).toEqual(['b']);
  });
  it('keeps two users of the same key in step', () => {
    const one = renderHook(() => useLocalList('t:shared'));
    const two = renderHook(() => useLocalList('t:shared'));
    act(() => one.result.current.toggle('x'));
    expect(two.result.current.list).toEqual(['x']);
    act(() => two.result.current.clear());
    expect(one.result.current.list).toEqual([]);
  });
  it('can replace the whole list (reordering)', () => {
    const { result } = renderHook(() => useLocalList('t:order'));
    act(() => { result.current.toggle('a'); result.current.toggle('b'); });
    act(() => result.current.set(['b', 'a']));
    expect(result.current.list).toEqual(['b', 'a']);
  });
});
