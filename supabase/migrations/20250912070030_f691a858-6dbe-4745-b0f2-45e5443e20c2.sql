-- Clean up duplicate data in points_of_interest table
DELETE FROM points_of_interest 
WHERE id NOT IN (
  SELECT DISTINCT ON (iso2, name) id 
  FROM points_of_interest 
  ORDER BY iso2, name, created_at DESC
);

-- Now create the unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS unique_points_of_interest_iso2_name ON public.points_of_interest (iso2, name);

-- Ensure countries has unique constraint too
CREATE UNIQUE INDEX IF NOT EXISTS unique_countries_iso2 ON public.countries (iso2);