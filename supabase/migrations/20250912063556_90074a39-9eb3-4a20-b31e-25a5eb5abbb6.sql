-- Add missing columns to countries table
ALTER TABLE public.countries 
ADD COLUMN IF NOT EXISTS iso3 text,
ADD COLUMN IF NOT EXISTS subregion text,
ADD COLUMN IF NOT EXISTS center_lat numeric,
ADD COLUMN IF NOT EXISTS center_lon numeric,
ADD COLUMN IF NOT EXISTS un_member boolean DEFAULT false;

-- Add extra column to points_of_interest for additional metadata
ALTER TABLE public.points_of_interest 
ADD COLUMN IF NOT EXISTS extra text;