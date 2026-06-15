-- Encrypt journal entries at the sync boundary.
-- Sensitive fields (content, title, tags, mood, inferred_sentiment, weather) are bundled,
-- AES-GCM encrypted client-side with a per-user Data Encryption Key (DEK), and stored in enc_blob.
-- The DEK is wrapped by a master KEK held ONLY in an edge-function secret; a DB dump alone
-- (wrapped DEK + ciphertext) cannot be decrypted.

-- Per-user wrapped DEK. wrapped_dek is AES-GCM-wrapped by the master KEK.
CREATE TABLE public.user_encryption_keys (
  user_id     uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  wrapped_dek text NOT NULL,                          -- base64( iv(12) || ciphertext+tag )
  wrap_alg    text NOT NULL DEFAULT 'AES-GCM-256',
  kek_version integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_encryption_keys ENABLE ROW LEVEL SECURITY;

-- SELECT only for owners; writes happen via the edge function (service role bypasses RLS),
-- so a compromised browser cannot overwrite/rotate the wrapped DEK.
CREATE POLICY "Users read own wrapped DEK"
  ON public.user_encryption_keys
  FOR SELECT
  USING (auth.uid() = user_id);

-- entries: encrypted blob + version. Relax content NOT NULL since it moves into the blob.
ALTER TABLE public.entries
  ADD COLUMN enc_blob text,                            -- base64( version(1) || iv(12) || ciphertext+tag )
  ADD COLUMN enc_version integer NOT NULL DEFAULT 0;   -- 0 = plaintext (legacy), 1 = encrypted

ALTER TABLE public.entries
  ALTER COLUMN content DROP NOT NULL;

-- App-level invariant (no DB CHECK, so rows can transition during backfill):
--   enc_version 0 -> plaintext columns set, enc_blob NULL
--   enc_version 1 -> enc_blob set, sensitive plaintext columns NULL
