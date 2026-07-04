import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MOODS, MOOD_CATEGORIES } from '@bloom/core/constants/moods';

import { MoodPicker } from './MoodPicker';

describe('MoodPicker', () => {
  it('renders every category as a labelled group with a header', () => {
    render(<MoodPicker value={[]} onChange={() => {}} />);
    for (const category of MOOD_CATEGORIES) {
      const group = screen.getByRole('group', { name: category.label });
      expect(group).toBeInTheDocument();
      expect(within(group).getByText(category.label)).toBeInTheDocument();
    }
  });

  it('renders a chip for every pickable mood', () => {
    render(<MoodPicker value={[]} onChange={() => {}} />);
    // Every mood in MOODS (ecstatic is excluded from the picker) shows a button.
    for (const mood of MOODS) {
      expect(screen.getByRole('button', { name: new RegExp(`^${mood.label} —`) })).toBeInTheDocument();
    }
  });

  it('selects a mood on click, adding it to the selection', () => {
    const onChange = vi.fn();
    render(<MoodPicker value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /^Apathetic —/ }));
    expect(onChange).toHaveBeenCalledWith(['apathetic']);
  });

  it('clicking a second, different chip adds it without clearing the first', () => {
    const onChange = vi.fn();
    render(<MoodPicker value={['joyful']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /^Angry —/ }));
    expect(onChange).toHaveBeenCalledWith(['joyful', 'angry']);
  });

  it('clicking an already-selected chip removes just that one, preserving order of the rest', () => {
    const onChange = vi.fn();
    render(<MoodPicker value={['joyful', 'grateful', 'loved']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /^Grateful —/ }));
    expect(onChange).toHaveBeenCalledWith(['joyful', 'loved']);
  });

  it('marks every selected chip as pressed, and unselected chips as not pressed', () => {
    render(<MoodPicker value={['joyful', 'angry']} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /^Joyful —/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^Angry —/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^Peaceful —/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('only the first selected mood (the primary) is marked as shaping the flower', () => {
    render(<MoodPicker value={['joyful', 'angry']} onChange={() => {}} />);
    expect(
      screen.getByRole('button', { name: /^Joyful —.*shapes your flower/ })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Angry —.*shapes your flower/ })
    ).not.toBeInTheDocument();
  });

  it('shows a caption naming the primary mood once something is selected', () => {
    render(<MoodPicker value={['joyful', 'angry']} onChange={() => {}} />);
    expect(screen.getByText(/Joyful shapes your flower/)).toBeInTheDocument();
  });

  it('shows no caption when nothing is selected', () => {
    render(<MoodPicker value={[]} onChange={() => {}} />);
    expect(screen.queryByText(/shapes your flower/)).not.toBeInTheDocument();
  });
});
