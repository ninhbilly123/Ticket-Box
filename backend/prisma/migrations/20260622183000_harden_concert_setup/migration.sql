-- Concerts opt in to a dynamic SVG map only after it has been configured.
ALTER TABLE "concerts"
ADD COLUMN "seat_map_enabled" BOOLEAN NOT NULL DEFAULT false;

-- Add a stable zone key before making it mandatory.
ALTER TABLE "ticket_types"
ADD COLUMN "zone_code" TEXT;

WITH normalized AS (
    SELECT
        "id",
        "concert_id",
        COALESCE(NULLIF(TRIM(BOTH '_' FROM REGEXP_REPLACE(UPPER(TRIM("name")), '[^A-Z0-9]+', '_', 'g')), ''), 'ZONE') AS "base_code"
    FROM "ticket_types"
), ranked AS (
    SELECT
        "id",
        "base_code",
        ROW_NUMBER() OVER (PARTITION BY "concert_id", "base_code" ORDER BY "id") AS "position"
    FROM normalized
)
UPDATE "ticket_types" AS ticket_type
SET "zone_code" = CASE
    WHEN ranked."position" = 1 THEN ranked."base_code"
    ELSE ranked."base_code" || '_' || ranked."position"::TEXT
END
FROM ranked
WHERE ticket_type."id" = ranked."id";

ALTER TABLE "ticket_types"
ALTER COLUMN "zone_code" SET NOT NULL;

CREATE UNIQUE INDEX "ticket_types_concert_id_zone_code_key"
ON "ticket_types"("concert_id", "zone_code");

-- Names are display labels but must still be distinguishable inside a concert.
WITH ranked_names AS (
    SELECT
        "id",
        "name",
        ROW_NUMBER() OVER (PARTITION BY "concert_id", LOWER(TRIM("name")) ORDER BY "id") AS "position"
    FROM "ticket_types"
)
UPDATE "ticket_types" AS ticket_type
SET "name" = ranked_names."name" || ' (' || ranked_names."position"::TEXT || ')'
FROM ranked_names
WHERE ticket_type."id" = ranked_names."id"
  AND ranked_names."position" > 1;

CREATE UNIQUE INDEX "ticket_types_concert_id_name_ci_key"
ON "ticket_types"("concert_id", LOWER(TRIM("name")));
