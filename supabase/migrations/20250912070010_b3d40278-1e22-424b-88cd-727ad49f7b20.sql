-- Ensure unique keys exist for upserts
CREATE UNIQUE INDEX IF NOT EXISTS unique_countries_iso2 ON public.countries (iso2);
CREATE UNIQUE INDEX IF NOT EXISTS unique_points_of_interest_iso2_name ON public.points_of_interest (iso2, name);