import { rankCommands } from './commands';

const items = [
  { id: 'over', label: 'Overview', keywords: 'dashboard home stats' },
  { id: 'spots', label: 'Spots', keywords: 'places list' },
  { id: 'new', label: 'Add a spot', keywords: 'new create' },
  { id: 'health', label: 'Content health', keywords: 'quality missing fix' },
  { id: 'rev', label: 'Reviews', keywords: 'moderation queue' },
  { id: 'users', label: 'Users', keywords: 'accounts people' },
];
const ids = (q) => rankCommands(items, q).map((c) => c.id);

describe('rankCommands', () => {
  it('an empty query keeps the list as it is', () => {
    expect(rankCommands(items, '')).toBe(items);
    expect(rankCommands(items, '   ')).toBe(items);
  });
  it('a label that starts with the text beats one that only contains it', () => {
    expect(ids('spot')[0]).toBe('spots');
    expect(ids('spot')).toContain('new');
  });
  it('matches the start of any word in the label', () => {
    expect(ids('health')[0]).toBe('health');
    expect(ids('hea')).toEqual(['health']);
  });
  it('also finds a command by the words people think of', () => {
    expect(ids('dashboard')).toEqual(['over']);
    expect(ids('moder')).toEqual(['rev']);
    expect(ids('accounts')).toEqual(['users']);
  });
  it('ignores case and accents, and returns nothing when nothing fits', () => {
    expect(ids('REVIÉWS')).toEqual(['rev']);
    expect(ids('zzz')).toEqual([]);
  });
  it('orders by how good the match is, and equal matches keep their original order', () => {
    // Spots 80 (starts with it), Add a spot 60 (a word starts with it), Reviews and Users 40 (contain it, list order), Overview 30 and Content health 20 (only their keywords)
    expect(ids('s')).toEqual(['spots', 'new', 'rev', 'users', 'over', 'health']);
  });
});
