/**
 * Shared chrome styles for the Bloom Meadow overlays (header pills, rails,
 * cards). Extracted from BloomMeadow so sibling components can match without
 * importing the meadow itself.
 */
import type React from 'react';

export const serif = "var(--font-display), Georgia, 'Times New Roman', serif";
export const sans = "var(--font-body), 'Segoe UI', sans-serif";
export const glass: React.CSSProperties = {
  background: 'rgba(22,27,36,.38)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(247,241,227,.16)',
  color: '#f7f1e3',
};
