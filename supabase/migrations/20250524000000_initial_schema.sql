-- Bloom Journal: entries, garden_meta, app_settings with RLS

CREATE TABLE public.entries (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text,
  content text NOT NULL,
  mood text,
  inferred_sentiment text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  flower_seed integer NOT NULL,
  flower_style text NOT NULL,
  garden_position jsonb,
  is_favourited boolean NOT NULL DEFAULT false,
  revisit_of text,
  is_deleted boolean NOT NULL DEFAULT false,
  weather jsonb,
  time_phase text,
  scene_season text
);

CREATE INDEX entries_user_updated_idx ON public.entries (user_id, updated_at);

CREATE TABLE public.garden_meta (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'watercolor',
  layout_mode text NOT NULL DEFAULT 'organic',
  last_entry_at timestamptz,
  has_planted_first boolean NOT NULL DEFAULT false,
  unlocked_seasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE public.app_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  reminder_enabled boolean NOT NULL DEFAULT false,
  reminder_hour integer NOT NULL DEFAULT 20,
  reminder_minute integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL
);

ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garden_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY entries_select ON public.entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY entries_insert ON public.entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY entries_update ON public.entries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY entries_delete ON public.entries FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY garden_meta_select ON public.garden_meta FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY garden_meta_insert ON public.garden_meta FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY garden_meta_update ON public.garden_meta FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY garden_meta_delete ON public.garden_meta FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY app_settings_select ON public.app_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY app_settings_insert ON public.app_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY app_settings_update ON public.app_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY app_settings_delete ON public.app_settings FOR DELETE USING (auth.uid() = user_id);
