import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Switch } from './switch';

describe('Switch', () => {
  it('exposes its checked state via role="switch" / aria-checked', () => {
    const { rerender } = render(
      <Switch checked={false} onCheckedChange={() => {}} aria-label="Notifications" />
    );
    const toggle = screen.getByRole('switch', { name: 'Notifications' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    rerender(<Switch checked onCheckedChange={() => {}} aria-label="Notifications" />);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onCheckedChange with the toggled value on click', () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onCheckedChange} aria-label="Sky events" />);
    fireEvent.click(screen.getByRole('switch', { name: 'Sky events' }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('does not fire when disabled', () => {
    const onCheckedChange = vi.fn();
    render(
      <Switch checked disabled onCheckedChange={onCheckedChange} aria-label="Sky events" />
    );
    fireEvent.click(screen.getByRole('switch', { name: 'Sky events' }));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
