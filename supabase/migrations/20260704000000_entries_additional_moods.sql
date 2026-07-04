-- Supplementary feelings beyond the primary `mood`, for multi-select mood picking.
-- Bundled into enc_blob alongside mood/tags for encrypted rows, same as the tags column.

ALTER TABLE public.entries
  ADD COLUMN additional_moods jsonb NOT NULL DEFAULT '[]'::jsonb;
