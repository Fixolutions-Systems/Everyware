-- Total earned by the service centre partner, for the Earnings screen.
-- A job earns once a technician has done the visit: closed, or closed with the part declined.
-- Weeks run Monday to Sunday in India time, matching the Monday payout.

SELECT
  ROUND(COALESCE(SUM("scpEarningAmountMicros"), 0) / 1000000, 2) AS total_earned_rupees,
  COUNT(*) AS jobs
FROM "_serviceJob"
WHERE "status" IN ('CLOSED', 'CLOSED_PART_DECLINED')
  AND "deletedAt" IS NULL
  AND "closedAt" >= date_trunc('week', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';
