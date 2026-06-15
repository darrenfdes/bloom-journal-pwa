-- flower_seed is an unsigned 32-bit hash (hashString >>> 0), up to 4_294_967_295.
-- int4 max is 2_147_483_647, so ~half of seeds failed to sync (error 22003). Widen to int8.
ALTER TABLE public.entries
  ALTER COLUMN flower_seed TYPE bigint;
