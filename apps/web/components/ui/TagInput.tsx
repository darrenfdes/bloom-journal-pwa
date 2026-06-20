'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  tags: string[];
  onChange: (tags: string[]) => void;
};

export function TagInput({ tags, onChange }: Props) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const t = input.trim();
    if (!t || tags.includes(t)) return;
    onChange([...tags, t]);
    setInput('');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="cursor-pointer"
            aria-label={`Remove tag ${tag}`}
            onClick={() => onChange(tags.filter((x) => x !== tag))}
          >
            {tag} ×
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter or comma commits the tag — comma is the common delimiter
            // users expect, so we consume it rather than letting it land in
            // the field.
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="Add a tag"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={addTag}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
