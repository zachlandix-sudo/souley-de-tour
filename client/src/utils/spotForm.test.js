import { emptyValues, fromSpot, imageProblem, normalizeImageUrl, toApiBody, validateSpotForm } from './spotForm';

const valid = () => ({ ...emptyValues(), name: 'A', description: 'B', municipality: 'C', shortDescription: 'D', images: ['https://x.test/a.jpg'] });

describe('validateSpotForm', () => {
  it('flags required fields', () => {
    const e = validateSpotForm(emptyValues());
    expect(Object.keys(e)).toEqual(expect.arrayContaining(['name', 'description', 'municipality', 'images']));
  });
  it('rejects 301-char short description', () => {
    expect(validateSpotForm({ ...valid(), shortDescription: 'x'.repeat(301) }).shortDescription).toBeTruthy();
  });
  it('needs both or neither coordinate', () => {
    expect(validateSpotForm({ ...valid(), latitude: '9.9' }).longitude).toBeTruthy();
  });
  it('rejects non-url images', () => {
    expect(validateSpotForm({ ...valid(), images: ['not a url'] }).images).toBeTruthy();
  });
  it('passes valid values', () => {
    expect(validateSpotForm(valid())).toEqual({});
  });
});

describe('toApiBody / fromSpot', () => {
  it('parses numbers and drops empty strings', () => {
    const b = toApiBody({ ...valid(), estimatedBudget: '1500', barangay: '' });
    expect(b.estimatedBudget).toBe(1500);
    expect(b).not.toHaveProperty('barangay');
  });
  it('maps coordinates both ways', () => {
    const f = fromSpot({ name: 'A', location: { coordinates: [125.07, 9.91] } });
    expect(f.latitude).toBe('9.91');
    expect(f.longitude).toBe('125.07');
    const b = toApiBody({ ...valid(), latitude: '9.91', longitude: '125.07' });
    expect(b.latitude).toBe(9.91);
    expect(b.longitude).toBe(125.07);
  });
});

describe('open days and best months', () => {
  it('start empty, which means every day and all year', () => {
    expect(emptyValues().openDays).toEqual([]);
    expect(emptyValues().bestMonths).toEqual([]);
  });
  it('load from a saved spot, with months as numbers', () => {
    const f = fromSpot({ name: 'A', openDays: ['Mon', 'Tue'], bestMonths: ['11', 12, 1] });
    expect(f.openDays).toEqual(['Mon', 'Tue']);
    expect(f.bestMonths).toEqual([11, 12, 1]);
    expect(fromSpot({ name: 'A' }).openDays).toEqual([]); // spots saved before these fields existed
  });
  it('are sent as lists, and an empty list is sent too so clearing them in the form clears them on the server', () => {
    const b = toApiBody({ ...valid(), openDays: ['Sat', 'Sun'], bestMonths: [3, 4] });
    expect(b.openDays).toEqual(['Sat', 'Sun']);
    expect(b.bestMonths).toEqual([3, 4]);
    const cleared = toApiBody(valid());
    expect(cleared.openDays).toEqual([]);
    expect(cleared.bestMonths).toEqual([]);
  });
});

describe('image links', () => {
  it('accepts the /spots placeholder path from the import', () => {
    expect(validateSpotForm({ ...valid(), images: ['/spots/some-spot.jpg'] })).toEqual({});
  });
  it('turns share links into direct photo links', () => {
    expect(normalizeImageUrl('https://drive.google.com/file/d/ABC123/view?usp=sharing')).toBe('https://lh3.googleusercontent.com/d/ABC123');
    expect(normalizeImageUrl('https://www.dropbox.com/s/xyz/a.jpg?dl=0')).toBe('https://dl.dropboxusercontent.com/s/xyz/a.jpg?raw=1');
    expect(normalizeImageUrl('https://imgur.com/AbCdE12')).toBe('https://i.imgur.com/AbCdE12.jpg');
  });
  it('explains when a link is a web page, not a photo', () => {
    expect(imageProblem('https://www.facebook.com/photo?fbid=1')).toMatch(/Copy image address/);
    expect(imageProblem('https://www.instagram.com/p/abc/')).toMatch(/client\/public\/spots/);
    expect(imageProblem('https://x.test/a.jpg')).toBe('');
  });
  it('saves normalized links', () => {
    expect(toApiBody({ ...valid(), images: ['https://imgur.com/AbCdE12'] }).images).toEqual(['https://i.imgur.com/AbCdE12.jpg']);
  });
});

describe('Google Images links', () => {
  const link = 'https://www.google.com/imgres?q=maasin%20cathedral&imgurl=https%3A%2F%2Fexample.com%2Fphotos%2Fcathedral.jpg%3Fw%3D800&imgrefurl=https%3A%2F%2Fexample.com%2Fpage&tbnid=abc';
  it('turns a Google Images result link into the real photo address', () => {
    expect(normalizeImageUrl(link)).toBe('https://example.com/photos/cathedral.jpg?w=800');
    expect(normalizeImageUrl('https://www.google.com.ph/imgres?imgurl=http%3A%2F%2Fa.test%2Fb.png')).toBe('http://a.test/b.png');
  });
  it('accepts that link in the form and sends the real address to the API', () => {
    expect(imageProblem(link)).toBe('');
    expect(toApiBody({ ...emptyValues(), images: [link] }).images).toEqual(['https://example.com/photos/cathedral.jpg?w=800']);
  });
  it('still rejects a Google link with no photo address, and ignores a non-http imgurl', () => {
    expect(imageProblem('https://www.google.com/imgres?q=x')).toMatch(/Copy image address/);
    expect(imageProblem('https://www.google.com/imgres?imgurl=javascript%3Aalert(1)')).toMatch(/Copy image address/);
    expect(normalizeImageUrl('https://www.google.com/imgres?imgurl=javascript%3Aalert(1)')).toBe('https://www.google.com/imgres?imgurl=javascript%3Aalert(1)');
  });
});

