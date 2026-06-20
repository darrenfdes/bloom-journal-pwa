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

// jsdom 26 ships Blob/File without `.text()`; browsers have it. Polyfill via FileReader so file
// reads (backup import, `.bloom` bouquet open) behave the same under test as in the app.
if (typeof Blob !== 'undefined' && typeof Blob.prototype.text !== 'function') {
  Blob.prototype.text = function text(this: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}
