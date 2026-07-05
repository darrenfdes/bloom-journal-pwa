import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VirtualJoystick } from '@/components/garden/explore/VirtualJoystick';
import type { MoveInput } from '@/lib/garden/explore/movement';

// jsdom has no PointerEvent constructor, so fireEvent.pointer* drops clientX/Y. A minimal
// MouseEvent subclass restores coordinates + pointerId for this file only.
class FakePointerEvent extends MouseEvent {
  pointerId: number;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
  }
}
(globalThis as { PointerEvent?: unknown }).PointerEvent = FakePointerEvent;

function setup() {
  const inputRef = { current: { forward: 0, strafe: 0 } as MoveInput };
  const { container } = render(<VirtualJoystick inputRef={inputRef} />);
  const pad = container.querySelector('[data-joystick]') as HTMLElement;
  expect(pad).toBeTruthy();
  return { inputRef, pad };
}

describe('VirtualJoystick', () => {
  it('writes a forward vector when dragging up from the touch point', () => {
    const { inputRef, pad } = setup();
    fireEvent.pointerDown(pad, { pointerId: 1, clientX: 100, clientY: 100 });
    expect(inputRef.current).toEqual({ forward: 0, strafe: 0 });
    fireEvent.pointerMove(pad, { pointerId: 1, clientX: 100, clientY: 60 });
    expect(inputRef.current.forward).toBeCloseTo(1);
    expect(inputRef.current.strafe).toBeCloseTo(0);
  });

  it('writes a strafe vector for sideways drags', () => {
    const { inputRef, pad } = setup();
    fireEvent.pointerDown(pad, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(pad, { pointerId: 1, clientX: 120, clientY: 100 });
    expect(inputRef.current.strafe).toBeCloseTo(0.5);
    expect(inputRef.current.forward).toBeCloseTo(0);
  });

  it('clamps the vector to unit length on big drags', () => {
    const { inputRef, pad } = setup();
    fireEvent.pointerDown(pad, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(pad, { pointerId: 1, clientX: 100, clientY: 300 });
    expect(inputRef.current.forward).toBeCloseTo(-1);
    expect(Math.hypot(inputRef.current.forward, inputRef.current.strafe)).toBeLessThanOrEqual(1);
  });

  it('resets to zero on release', () => {
    const { inputRef, pad } = setup();
    fireEvent.pointerDown(pad, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(pad, { pointerId: 1, clientX: 100, clientY: 60 });
    fireEvent.pointerUp(pad, { pointerId: 1 });
    expect(inputRef.current).toEqual({ forward: 0, strafe: 0 });
  });

  it('ignores moves from other pointers', () => {
    const { inputRef, pad } = setup();
    fireEvent.pointerDown(pad, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(pad, { pointerId: 2, clientX: 100, clientY: 10 });
    expect(inputRef.current).toEqual({ forward: 0, strafe: 0 });
  });
});
