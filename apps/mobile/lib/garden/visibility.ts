const DEFAULT_BUFFER = 320;

export function isXRangeVisible(
  left: number,
  right: number,
  scrollLeft: number,
  viewportWidth: number,
  buffer = DEFAULT_BUFFER
): boolean {
  const viewLeft = scrollLeft - buffer;
  const viewRight = scrollLeft + viewportWidth + buffer;
  return right >= viewLeft && left <= viewRight;
}
