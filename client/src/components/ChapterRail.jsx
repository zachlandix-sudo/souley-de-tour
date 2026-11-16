import { useEffect, useRef, useState } from 'react';

// Chapter rail for wide screens: a hairline on the right edge of the story that fills as you read, with one dot per chapter.
// The dot of the chapter at the middle of the screen is lit and enlarged; every dot jumps to its chapter. Hidden on smaller screens (index.css).
// Place it inside a `position: relative` element that is as tall as the story; it sticks to the middle of the screen while you read.
// items: [{ id, n, label }], id = the DOM id of the chapter's element. The scroll listener only writes one CSS variable (--fill)
// and re-renders when the active chapter changes, never once per frame.
// INP (update 66): the chapters' positions are measured only when the layout can have changed (load, resize, the story resizing),
// as page offsets. A scroll frame then just reads window.scrollY, so it never forces a layout, however busy the page is.
export default function ChapterRail({ items, label }) {
  const nav = useRef(null);
  const [active, setActive] = useState(0);
  const ids = items.map((it) => it.id).join('|');

  useEffect(() => {
    const el = nav.current;
    if (!el || items.length < 2) return undefined;
    let raf = 0, ys = null; // ys: page offset of the centre of each chapter, null = measure again
    const measure = () => {
      const rects = items.map((it) => document.getElementById(it.id)?.getBoundingClientRect());
      if (rects.some((r) => !r) || !rects.some((r) => r.height)) { ys = null; return; } // not on the page yet, or hidden (display: none)
      const sy = window.scrollY || 0;
      ys = rects.map((r) => r.top + sy + r.height / 2);
    };
    const update = () => {
      raf = 0;
      if (!ys) measure();
      if (!ys) return;
      const mid = window.scrollY + window.innerHeight / 2;
      // Where the middle of the screen is along the chapters: 0 = at the first one, items.length - 1 = at the last one.
      let pos = 0;
      for (let i = 0; i < ys.length - 1; i++) {
        if (mid >= ys[i + 1]) { pos = i + 1; continue; }
        if (mid > ys[i]) pos = i + (mid - ys[i]) / (ys[i + 1] - ys[i]);
        break;
      }
      el.style.setProperty('--fill', (pos / (items.length - 1)).toFixed(4));
      setActive(Math.round(pos));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    const remeasure = () => { ys = null; onScroll(); };
    const story = document.getElementById(items[0].id)?.parentElement; // the story box: it changes size when a chapter does
    const ro = typeof ResizeObserver !== 'undefined' && story ? new ResizeObserver(remeasure) : null; // fonts, images and the language change the chapter heights
    ro?.observe(story);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', remeasure);
    window.addEventListener('load', remeasure);
    update();
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', remeasure); window.removeEventListener('load', remeasure); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  return (
    <div className="about-rail-wrap">
      <nav ref={nav} aria-label={label} className="about-rail">
        <span aria-hidden="true" className="about-rail-line"><i /></span>
        <ol>
          {items.map((it, i) => (
            <li key={it.id} className={`${i <= active ? 'is-lit' : ''} ${i === active ? 'is-on' : ''}`}>
              <a href={`#${it.id}`} aria-label={`${it.n} ${it.label}`} aria-current={i === active ? 'location' : undefined}>
                <span aria-hidden="true" className="about-rail-dot" />
                <span aria-hidden="true" className="about-rail-tip">{it.n} · {it.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
