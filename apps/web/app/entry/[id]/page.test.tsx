import 'fake-indexeddb/auto';

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDb } from '@/lib/db/client';

import { entry } from '../../../test/fixtures/entry';
import EntryPage from './page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'e1' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

beforeEach(async () => {
  await getDb().entries.clear();
});

describe('entry page', () => {
  it('shows a live entry', async () => {
    await getDb().entries.put(entry({ id: 'e1', content: 'Sunlight on the kettle.' }));
    render(<EntryPage />);
    expect(await screen.findByText('Sunlight on the kettle.')).toBeInTheDocument();
  });

  it('treats a removed entry as not found', async () => {
    await getDb().entries.put(entry({ id: 'e1', content: 'Gone now.', isDeleted: true }));
    render(<EntryPage />);
    expect(await screen.findByText('Entry not found.')).toBeInTheDocument();
    expect(screen.queryByText('Gone now.')).not.toBeInTheDocument();
  });
});
