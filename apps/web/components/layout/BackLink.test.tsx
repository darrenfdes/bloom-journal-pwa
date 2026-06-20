import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BackLink } from './BackLink';

describe('BackLink', () => {
  it('links to the given destination with its label', () => {
    render(<BackLink href="/settings" label="Settings" />);
    const link = screen.getByRole('link', { name: /settings/i });
    expect(link).toHaveAttribute('href', '/settings');
  });
});
