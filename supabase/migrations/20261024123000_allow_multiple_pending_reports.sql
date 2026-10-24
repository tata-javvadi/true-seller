-- The original schema made identifier unique. The admin workflow now stores
-- each new submission as a pending row and merges reports when approved, so
-- multiple pending reports for the same seller must be allowed.
DROP INDEX IF EXISTS fraud_reports_identifier_unique_idx;
