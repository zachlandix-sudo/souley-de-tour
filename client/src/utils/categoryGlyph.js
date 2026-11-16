// Categories may store an emoji ("🏝️") or an icon NAME ("map-pin", "waves"). Only an emoji can be shown as a picture;
// a name is just a word, so it is not drawn (it would spill over the category name).
export const isEmoji = (icon) => !!icon && !/^[a-z0-9 _-]+$/i.test(String(icon).trim());
export const categoryGlyph = (icon) => (isEmoji(icon) ? String(icon).trim() : '');
