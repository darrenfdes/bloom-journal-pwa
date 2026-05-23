const DEFAULT_BUFFER = 320;

export function isYRangeVisible(
  top: number,
  bottom: number,
  scrollTop: number,
  viewportHeight: number,
  buffer = DEFAULT_BUFFER
): boolean {
  const viewTop = scrollTop - buffer;
  const viewBottom = scrollTop + viewportHeight + buffer;
  return bottom >= viewTop && top <= viewBottom;
}

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
