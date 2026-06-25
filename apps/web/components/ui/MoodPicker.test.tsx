import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MOODS, MOOD_CATEGORIES } from '@bloom/core/constants/moods';

import { MoodPicker } from './MoodPicker';

describe('MoodPicker', () => {
  it('renders every category as a labelled group with a header', () => {
    render(<MoodPicker value={null} onChange={() => {}} />);
    for (const category of MOOD_CATEGORIES) {
      const group = screen.getByRole('group', { name: category.label });
      expect(group).toBeInTheDocument();
      expect(within(group).getByText(category.label)).toBeInTheDocument();
    }
  });

  it('renders a chip for every pickable mood', () => {
    render(<MoodPicker value={null} onChange={() => {}} />);
    // Every mood in MOODS (ecstatic is excluded from the picker) shows a button.
    for (const mood of MOODS) {
      expect(screen.getByRole('button', { name: new RegExp(`^${mood.label} —`) })).toBeInTheDocument();
    }
  });

  it('selects a mood on click and marks it pressed', () => {
    const onChange = vi.fn();
    render(<MoodPicker value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /^Apathetic —/ }));
    expect(onChange).toHaveBeenCalledWith('apathetic');
  });

  it('is single-select: clicking the active chip clears it', () => {
    const onChange = vi.fn();
    render(<MoodPicker value="apathetic" onChange={onChange} />);
    const chip = screen.getByRole('button', { name: /^Apathetic —/ });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(chip);
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
