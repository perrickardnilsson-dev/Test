-- Better Auth 1.7: account identity scoped by (issuer, accountId)

ALTER TABLE "account" ADD COLUMN IF NOT EXISTS issuer text;

UPDATE "account"
SET issuer = 'local:credential'
WHERE issuer IS NULL AND provider_id = 'credential';

UPDATE "account"
SET issuer = 'local:oauth:' || replace(provider_id, '/', '%2F')
WHERE issuer IS NULL;

ALTER TABLE "account" ALTER COLUMN issuer SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS account_issuer_account_id_uidx
  ON "account" (issuer, account_id);
