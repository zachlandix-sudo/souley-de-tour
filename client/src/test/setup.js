import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

// jsdom has no matchMedia; the motion components ask for it (reduced motion, fine pointer). Report "no match" everywhere.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } });
}
