import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

Element.prototype.scrollTo = function scrollTo(options?: ScrollToOptions | number) {
  if (typeof options === 'number') {
    this.scrollLeft = options;
    return;
  }
  if (options?.left !== undefined) {
    this.scrollLeft = options.left;
  }
};

window.requestAnimationFrame = (cb: FrameRequestCallback) => {
  cb(0);
  return 0;
};
