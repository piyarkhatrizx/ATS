-- Drop Application.firstCalledAt.
--
-- Analytics computes median time to first call from CALL_LOGGED activity rows,
-- which are the single source of truth for what happened. A denormalised column
-- holding the same fact would drift the moment a call is logged, edited or
-- backfilled through any path that forgets to maintain it. No rows carried a
-- value, so nothing is lost.

-- AlterTable
ALTER TABLE "Application" DROP COLUMN "firstCalledAt";

