-- Backfill Application.statusId from the ApplicationStatus enum.
--
-- Status.key was seeded to mirror the enum values exactly, so this is a 1:1
-- join with no guesswork. The old column is deliberately NOT dropped here:
-- that happens in a separate migration once this backfill is verified, so a
-- bad mapping is recoverable rather than destructive.

UPDATE "Application" a
SET "statusId" = s.id
FROM "Status" s
WHERE s.key = a."status"::text
  AND a."statusId" IS NULL;

-- Any row the join missed would be an enum value with no matching Status row.
-- Fail loudly rather than silently leaving it null and then forcing NOT NULL.
DO $$
DECLARE unmapped INT;
BEGIN
  SELECT COUNT(*) INTO unmapped FROM "Application" WHERE "statusId" IS NULL;
  IF unmapped > 0 THEN
    RAISE EXCEPTION 'Backfill incomplete: % application(s) have no matching Status row', unmapped;
  END IF;
END $$;

ALTER TABLE "Application" ALTER COLUMN "statusId" SET NOT NULL;
