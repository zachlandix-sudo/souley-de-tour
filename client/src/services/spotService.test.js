import { vi } from 'vitest';
import api from './api';
import { getSpot, listSpots } from './spotService';
import { listCategories } from './categoryService';

vi.mock('./api', () => ({ default: { get: vi.fn() } }));

describe('services', () => {
  beforeEach(() => api.get.mockReset());
  it('listSpots passes params and returns data + pagination', async () => {
    api.get.mockResolvedValue({ data: { data: [{ _id: '1' }], pagination: { page: 2, pages: 3 } } });
    const r = await listSpots({ search: 'a', page: 2 });
    expect(api.get).toHaveBeenCalledWith('/tourist-spots', expect.objectContaining({ params: { search: 'a', page: 2 } }));
    expect(r).toEqual({ data: [{ _id: '1' }], pagination: { page: 2, pages: 3 } });
  });
  it('getSpot encodes the slug and unwraps data', async () => {
    api.get.mockResolvedValue({ data: { data: { name: 'X' } } });
    expect(await getSpot('a b')).toEqual({ name: 'X' });
    expect(api.get.mock.calls[0][0]).toBe('/tourist-spots/a%20b');
  });
  it('listCategories unwraps data', async () => {
    api.get.mockResolvedValue({ data: { data: [{ slug: 'nature' }] } });
    expect(await listCategories()).toEqual([{ slug: 'nature' }]);
  });
});
