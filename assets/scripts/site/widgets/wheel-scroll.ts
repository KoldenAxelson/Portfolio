// Sideways rows that a mouse wheel can pan: any [data-wheel-scroll] track (the
// impossible list's book shelves, _default/impossible-list.html). A vertical
// wheel over the row scrolls it left/right until it reaches an end, then hands
// the wheel back to the page so the visitor is never trapped in the row.

const LINE_HEIGHT_PX = 16;

let teardown: (() => void)[] = [];

// Firefox reports some wheels in lines or pages rather than pixels.
const wheelDeltaPx = (e: WheelEvent, track: HTMLElement): number => {
  if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) return e.deltaY * LINE_HEIGHT_PX;
  if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) return e.deltaY * track.clientWidth;
  return e.deltaY;
};

function onWheel(e: WheelEvent): void {
  const track = e.currentTarget as HTMLElement;
  // A trackpad's sideways swipe already scrolls the row natively.
  if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
  const maxScroll = track.scrollWidth - track.clientWidth;
  // 1px tolerance: scrollLeft can land on a fractional pixel at the far end.
  const isAtStart = track.scrollLeft <= 0 && e.deltaY < 0;
  const isAtEnd = track.scrollLeft >= maxScroll - 1 && e.deltaY > 0;
  if (maxScroll <= 0 || isAtStart || isAtEnd) return;
  e.preventDefault();
  track.scrollLeft += wheelDeltaPx(e, track);
}

export function initWheelScroll(): void {
  for (const off of teardown) off();
  teardown = [];
  for (const track of Array.from(document.querySelectorAll<HTMLElement>('[data-wheel-scroll]'))) {
    // Not passive: preventDefault is what stops the page scrolling underneath.
    track.addEventListener('wheel', onWheel, { passive: false });
    teardown.push(() => track.removeEventListener('wheel', onWheel));
  }
}
