# Supabase setup scripts

These are the SQL files for a Supabase-hosted install. Read `../db/README.md`
first — it explains the two provisioning paths, the patch log in
`lib/system.ts`, the security model and how to add a migration.

## How to apply

1. Create the project and note the project URL and anon key.
2. Open the SQL editor and run the files **in filename order**, starting with
   `00-signup-bootstrap.sql`.
3. Each file is idempotent. If one fails, fix the reported statement and re-run
   the whole file — do not skip ahead.
4. Confirm the patches are recorded by checking the app's systems screen or the
   `patches` table (both are internal; the public site never exposes them).

## Rules

- Do not rename an applied file. The patch runner tracks filenames.
- Do not edit an applied file to change behaviour — add the next numbered file
  and register it in `PATCH_LOG`.
- Keep storage buckets private. The `documents` bucket must remain
  `public = false`.
- Every new table needs `ALTER TABLE … ENABLE ROW LEVEL SECURITY` and a policy
  scoped to `auth.uid()`.
