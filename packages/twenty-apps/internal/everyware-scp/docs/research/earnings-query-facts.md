# Earnings query: verified facts

Research date: 2026-09-28. Sources: official PostgreSQL docs (current, checked against the dev server, PostgreSQL 16.13) and the Twenty source in this repo.

The query under review lives at `packages/twenty-apps/internal/everyware-scp/sql/earnings-total.sql`.

## Answer

The query is correct on the database it was written for. `now() AT TIME ZONE 'Asia/Kolkata'` gives the current India wall-clock time with no zone, `date_trunc('week', ...)` snaps that back to Monday 00:00, and the second `AT TIME ZONE 'Asia/Kolkata'` turns it back into an absolute instant (Monday 00:00 IST, which is Sunday 18:30 UTC). The session TimeZone setting changes how that instant is displayed, not its value, so the filter is stable. `scpEarningAmountMicros` is a `numeric` column, so `SUM` returns `numeric`, dividing by `1000000` is exact decimal division (no integer truncation), and `ROUND(numeric, 2)` is a valid call. `closedAt` and `deletedAt` are `timestamptz`, and `deletedAt IS NULL` is exactly how Twenty itself hides trashed rows. The weak points are not the maths but the integration path: the `_` table prefix and column names are Twenty internals computed by code, raw SQL bypasses Twenty's role and row-level permissions, and Twenty documents only its REST/GraphQL APIs (which already expose a `sumScpEarningAmountMicros` aggregate) as the way apps read data. The query also ignores `scpEarningCurrencyCode`.

## 1. `AT TIME ZONE`, `date_trunc('week')`, and the session TimeZone

**Direction of conversion.** From PostgreSQL docs section 9.9.4, "AT TIME ZONE and AT LOCAL":

- `timestamp without time zone AT TIME ZONE zone` returns `timestamp with time zone`. It "converts given time stamp without time zone to time stamp with time zone, assuming the given value is in the named time zone."
- `timestamp with time zone AT TIME ZONE zone` returns `timestamp without time zone`. It "converts given time stamp with time zone to time stamp without time zone, as the time would appear in that zone."

Source: https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-ZONECONVERT

**What `now()` is.** `now()` is `transaction_timestamp()`, the start time of the current transaction, type `timestamptz`. Source: https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT

**What `timestamptz` stores.** "The value is stored internally as UTC, and the originally stated or assumed time zone is not retained." On output it is "always converted from UTC to the current timezone zone". Source: https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME-INPUT-TIME-STAMPS

**`date_trunc`.** Returns the same type it is given. For `timestamptz` input, truncation is done "with respect to the current TimeZone setting" unless a third `time_zone` argument is passed. For plain `timestamp` input there is no zone involved. Source: https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-TRUNC

**Week start.** The `week` field is the ISO 8601 week: "By definition, ISO weeks start on Mondays." Source: https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-EXTRACT. `date_trunc('week', ...)` therefore lands on Monday 00:00.

**Putting it together.**

1. `now() AT TIME ZONE 'Asia/Kolkata'`: `timestamptz` in, plain `timestamp` out, showing India wall-clock time.
2. `date_trunc('week', <that>)`: plain `timestamp` in, so no session zone is used. Result is Monday 00:00 (India wall clock).
3. `<that> AT TIME ZONE 'Asia/Kolkata'`: plain `timestamp` in, `timestamptz` out, meaning "Monday 00:00 in India" as an absolute instant.

**Does the session TimeZone matter?** Not for the value. Step 1 depends only on the absolute instant `now()`, step 2 works on a zone-less value, step 3 names the zone explicitly. The comparison `"closedAt" >= ...` is between two `timestamptz` values, which are compared as UTC instants. Only the displayed text changes.

Checked on the dev database (read-only), 2026-09-28:

| Session TimeZone | Displayed result | Epoch seconds | Weekday of truncated value |
|---|---|---|---|
| UTC | 2026-09-27 18:30:00+00 | 1790533800 | Mon |
| America/Los_Angeles | 2026-09-27 11:30:00-07 | 1790533800 | Mon |
| Asia/Kolkata | 2026-09-28 00:00:00+05:30 | 1790533800 | Mon |

The dev server's default TimeZone is `Etc/UTC`.

Equivalent shorter form, also documented: `date_trunc('week', now(), 'Asia/Kolkata')` (the three-argument form truncates a `timestamptz` in the named zone and returns `timestamptz`). Same docs anchor as above.

## 2. `SUM`, division by `1000000`, and `ROUND`

**`SUM` result type.** From the aggregate functions table: `sum(integer) → bigint`, `sum(bigint) → numeric`, `sum(numeric) → numeric`, `sum(double precision) → double precision`. Also: "sum of no rows returns null, not zero as one might expect ... The coalesce function can be used to substitute zero". Source: https://www.postgresql.org/docs/current/functions-aggregate.html#FUNCTIONS-AGGREGATE-TABLE

**Division.** `numeric_type / numeric_type → numeric_type`, and "for integral types, division truncates the result towards zero" (`5 / 2 → 2`). Mixed-type calls such as `integer + numeric` "are resolved by using the type appearing later in these lists", that is `numeric`. Source: https://www.postgresql.org/docs/current/functions-math.html#FUNCTIONS-MATH-OP-TABLE

So `numeric / 1000000` is numeric division (no truncation). Integer truncation would only bite if the summed column were `integer` or `smallint` (sum gives `bigint`, then `bigint / integer` truncates). A `bigint` column is safe because its sum is already `numeric`.

**`ROUND`.** `round(v numeric, s integer) → numeric`. There is no two-argument `round` for `double precision`, so `ROUND(float8_value, 2)` fails with "function round(double precision, integer) does not exist". Source: https://www.postgresql.org/docs/current/functions-math.html#FUNCTIONS-MATH-FUNC-TABLE

Checked on the dev database: `pg_typeof(coalesce(sum(x::numeric),0)/1000000)` is `numeric`; `round(12345678::numeric/1000000, 2)` is `12.35`; `round(12345678::bigint/1000000, 2)` is `12.00` (the truncation trap); summing zero rows gives `0.00`.

## 3. How Twenty stores a CURRENCY field

A CURRENCY field is a composite of two sub-fields: `amountMicros` (field type NUMERIC) and `currencyCode` (TEXT).
Source: `packages/twenty-shared/src/types/composite-types/currency.composite-type.ts` lines 4-20.

Each sub-field becomes its own column named `<fieldName><PascalCase(subField)>`.
Source: `packages/twenty-server/src/engine/metadata-modules/field-metadata/utils/compute-column-name.util.ts` lines 43-49 (`${name}${pascalCase(compositeProperty.name)}`), used when building columns in `packages/twenty-server/src/engine/workspace-manager/workspace-migration/workspace-migration-runner/utils/generate-column-definitions.util.ts` lines 58-70.

SQL types come from `fieldMetadataTypeToColumnType`: NUMERIC → `numeric`, TEXT → `text`.
Source: `packages/twenty-server/src/engine/workspace-manager/workspace-migration/workspace-migration-runner/utils/field-metadata-type-to-column-type.util.ts` lines 17-24.

So the app field `scpEarning` (`packages/twenty-apps/internal/everyware-scp/src/objects/job.object.ts` lines 101-107) becomes `scpEarningAmountMicros numeric` and `scpEarningCurrencyCode text`, which `\d` on the dev database confirms. Both are nullable.

"Micros" means amount times 1,000,000: `packages/twenty-front/src/utils/convertCurrencyToCurrencyMicros.ts` lines 4 and 10.

## 4. DATE_TIME column type

DATE_TIME maps to `timestamptz` (timestamp with time zone); DATE maps to `date`.
Source: `field-metadata-type-to-column-type.util.ts` lines 30-33 (same file as above).

Confirmed on the dev database: `closedAt`, `deletedAt`, `createdAt` are all `timestamp with time zone`. The app declares `closedAt` as `FieldType.DATE_TIME` in `job.object.ts` lines 161-167.

## 5. Soft delete and custom-object table names

**Soft delete.** `deletedAt` is a system field present on every object (`packages/twenty-docs/developers/extend/apps/data/system-fields.mdx` line 15).

- Soft delete sets `deletedAt = CURRENT_TIMESTAMP`; restore sets it back to `NULL`. Source: `packages/twenty-server/src/engine/twenty-orm/query-builder/workspace-mutation-query-builder.ts` lines 140-156.
- Twenty's own reads add `"deletedAt" IS NULL` unless deleted rows are explicitly requested. Source: `packages/twenty-server/src/engine/twenty-orm/sql/utils/build-select-statement.util.ts` lines 374-388.
- Trashed rows are hard-deleted later by a cleanup job once `deletedAt` is older than the workspace's `trashRetentionDays` (default 14). Sources: `packages/twenty-server/src/engine/trash-cleanup/services/trash-cleanup.service.ts` lines 118 and 139-145; `packages/twenty-server/src/engine/core-modules/workspace/workspace.entity.ts` lines 140-141.

So `"deletedAt" IS NULL` in the query matches what the app UI and API show.

**Table naming.** Table name is `_` + `nameSingular` when the object is "custom", else plain `nameSingular`.
Source: `packages/twenty-server/src/engine/utils/compute-table-name.util.ts` lines 1-5.

"Custom" here means any object whose application is not the Twenty standard application, which includes every app-defined object.
Source: `packages/twenty-server/src/engine/utils/compute-object-target-table.util.ts` lines 11-21.

The schema is `workspace_<base36 of workspace id>`.
Source: `packages/twenty-server/src/engine/workspace-datasource/utils/get-workspace-schema-name.util.ts` lines 3-5.

**Stable or internal?** The naming is deterministic code, not a documented contract. No app-facing doc under `packages/twenty-docs/developers/extend` mentions table names, the `_` prefix, or column naming; objects are documented by `nameSingular` and `universalIdentifier` only (`packages/twenty-docs/developers/extend/apps/data/objects.mdx` lines 7 and 79). The column-name function even carries a comment `// TODO: If we need to implement custom name logic for columns, we can do it here` (`compute-column-name.util.ts` line 20). Treat table and column names as an implementation detail that can change in a Twenty upgrade.

## 6. Is raw SQL a supported integration path?

No doc in the repo presents raw SQL against workspace schemas as an app integration path. What is documented:

- The Core API (`/rest/`, `/graphql/`) for record CRUD, generated per workspace, including custom objects. Source: `packages/twenty-docs/developers/extend/api.mdx` lines 9-25.
- App logic functions read data through `CoreApiClient` / `RestApiClient` from `twenty-client-sdk`, which act as the triggering person's role intersected with the app's role, or as the application for cron and webhooks. Source: `packages/twenty-docs/developers/extend/apps/logic/logic-functions.mdx` lines 17-24 and 552-582.
- Searched `packages/twenty-docs`, `packages/twenty-server/docs` and `packages/twenty-apps` for raw SQL or direct Postgres guidance: nothing found. The repo `CLAUDE.md` mentions a read-only Postgres MCP server, but only for developers inspecting data and migrations.

Raw SQL skips Twenty's permission layer: the soft-delete filter and row-level permission predicates are added by Twenty's query builder (`build-select-statement.util.ts`, `packages/twenty-server/src/engine/twenty-orm/utils/build-row-level-permission-record-filter.util.ts`), not by Postgres.

The supported equivalent exists: the GraphQL schema exposes `sum<Field>AmountMicros` aggregates for CURRENCY fields, so `sumScpEarningAmountMicros` with a `closedAt` / `status` filter covers this query. Source: `packages/twenty-server/src/engine/api/graphql/workspace-schema-builder/utils/get-available-aggregations-from-object-fields.util.ts` lines 168-172.

## Implications for the earnings query

- The Monday-in-India week boundary is correct and does not depend on the session TimeZone. `date_trunc('week', now(), 'Asia/Kolkata')` is an equivalent, easier-to-read form.
- The arithmetic is safe because `scpEarningAmountMicros` is `numeric`. If the column ever became `integer`, the division would silently truncate to whole rupees.
- `COALESCE(..., 0)` is needed and correct: `SUM` of zero rows is `NULL`.
- `"deletedAt" IS NULL` matches Twenty's own trash behaviour. Keep it.
- The query sums amounts without checking `scpEarningCurrencyCode`. Fine if every job is INR, wrong otherwise. Consider `AND "scpEarningCurrencyCode" = 'INR'` or grouping by currency.
- The status list must match the enum labels exactly or Postgres errors. Current labels on dev: NEW, ACCEPTED, ON_THE_WAY, IN_PROGRESS, CLOSED, CLOSED_PART_DECLINED, REVISIT.
- `"_serviceJob"` is unqualified, so it relies on `search_path` pointing at the workspace schema. That schema name is per workspace.
- `_serviceJob` and the `...AmountMicros` column names are Twenty internals, and raw SQL bypasses permissions. For shipped app code, prefer the GraphQL aggregate (`sumScpEarningAmountMicros`) via `CoreApiClient`, and keep the SQL as a dev and reporting check.
