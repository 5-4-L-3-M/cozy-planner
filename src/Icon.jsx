const P = {
  menu: 'M4 6h16M4 12h16M4 18h10',
  chevd: 'M6 9l6 6 6-6',
  chevl: 'M15 6l-6 6 6 6',
  chevr: 'M9 6l6 6-6 6',
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14M20 20l-3.5-3.5',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  up: 'M12 19V5M6 11l6-6 6 6',
  pen: 'M4 20l4-1L19 8a2 2 0 0 0-3-3L5 16z',
  highlighter: 'M9 15l-4 4h5l2-2M9 15l7-11 4 3-7 11z',
  eraser: 'M8 20h12M5 15l9-9 5 5-8 9H9z',
  lasso: 'M5 10c0-4 4-6 8-6s7 2 7 5-3 6-8 6c-2 0-3 1-3 3s1 3 2 3',
  drop: 'M2 22l1-1h3l9-9M3 21v-3l9-9M15 6l3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4z',
  sticker: 'M20 12V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h7zM12 20c0-5 3-8 8-8M9 10h.01M14 10h.01',
  x: 'M6 6l12 12M18 6L6 18',
  books: 'M4 4h4v16H4zM10 4h4v16h-4zM16 5.5l3.4-1 3.4 15-3.4 1z',
  more: 'M12 4.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0-3zM12 10.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0-3zM12 16.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0-3z',
  star: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z',
  pages: 'M5 4h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM14 4h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM5 13h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1zM14 13h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z',
  repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
  clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7v5l3 2',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  shrink: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
  text: 'M5 7V4h14v3M12 4v16M9 20h6',
  pointer: 'M6 3l12 9-5.5 1.2L15 19l-2.4 1.1-2.5-5.8L6 18z',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10',
};

export default function Icon({ n, s = 20, dash }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash ? '3 3' : undefined} aria-hidden="true">
      <path d={P[n]} />
    </svg>
  );
}
