// Bottom sheets: drag the little handle (or the top edge of the sheet) down to close it.
// Closing goes through the sheet's backdrop, so sheets that shouldn't close that way just bounce back.
let drag = null;
addEventListener('pointerdown', (e) => {
  const sheet = e.target.closest?.('.sheet');
  if (!sheet || sheet.classList.contains('nograb')) return;
  const onGrab = e.target.closest('.grab') || e.clientY - sheet.getBoundingClientRect().top < 28;
  if (!onGrab || matchMedia('(min-width: 1000px)').matches) return;
  drag = { sheet, y: e.clientY, dy: 0, t: performance.now() };
  sheet.style.transition = 'none';
}, true);
addEventListener('pointermove', (e) => {
  if (!drag) return;
  drag.dy = Math.max(0, e.clientY - drag.y);
  drag.sheet.style.transform = `translateY(${drag.dy}px)`;
}, true);
const end = () => {
  if (!drag) return;
  const { sheet, dy, t } = drag; drag = null;
  const fast = dy > 40 && dy / (performance.now() - t) > 0.5;
  const bg = sheet.previousElementSibling;
  sheet.style.transition = 'transform .2s ease';
  if ((dy > 90 || fast) && bg?.classList.contains('sheet-bg')) {
    sheet.style.transform = 'translateY(100%)';
    setTimeout(() => {
      bg.click();
      // Still here? That sheet doesn't close by swiping (a form), so slide it back up.
      setTimeout(() => { if (sheet.isConnected) { sheet.style.transform = ''; setTimeout(() => { sheet.style.transition = ''; }, 220); } }, 60);
    }, 150);
  } else {
    sheet.style.transform = '';
    setTimeout(() => { sheet.style.transition = ''; }, 220);
  }
};
addEventListener('pointerup', end, true);
addEventListener('pointercancel', end, true);
