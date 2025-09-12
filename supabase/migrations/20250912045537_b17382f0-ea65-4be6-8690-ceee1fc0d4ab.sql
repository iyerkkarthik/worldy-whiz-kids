-- Create countries table
CREATE TABLE public.countries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_name TEXT NOT NULL,
  iso2 TEXT NOT NULL UNIQUE,
  continent TEXT NOT NULL CHECK (continent IN ('Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania')),
  capital TEXT,
  population_millions DECIMAL,
  area_km2 DECIMAL,
  currency TEXT,
  primary_language TEXT,
  flag_image_url TEXT,
  capital_lat DECIMAL,
  capital_lon DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create points of interest table
CREATE TABLE public.points_of_interest (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  iso2 TEXT NOT NULL REFERENCES public.countries(iso2) ON DELETE CASCADE,
  poi_type TEXT NOT NULL CHECK (poi_type IN ('landmark', 'mountain', 'forest')),
  name TEXT NOT NULL,
  description TEXT,
  lat DECIMAL,
  lon DECIMAL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_countries_continent ON public.countries(continent);
CREATE INDEX idx_countries_iso2 ON public.countries(iso2);
CREATE INDEX idx_countries_country_name ON public.countries(country_name);
CREATE INDEX idx_poi_iso2 ON public.points_of_interest(iso2);
CREATE INDEX idx_poi_type ON public.points_of_interest(poi_type);

-- Enable Row Level Security
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_of_interest ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (kids app doesn't need auth)
CREATE POLICY "Countries are viewable by everyone" 
ON public.countries 
FOR SELECT 
USING (true);

CREATE POLICY "Points of interest are viewable by everyone" 
ON public.points_of_interest 
FOR SELECT 
USING (true);

-- Insert demo data
INSERT INTO public.countries (country_name, iso2, continent, capital, population_millions, area_km2, currency, primary_language, flag_image_url, capital_lat, capital_lon) VALUES
('United States', 'US', 'North America', 'Washington D.C.', 331.9, 9833517, 'USD', 'English', null, 38.9072, -77.0369),
('Canada', 'CA', 'North America', 'Ottawa', 38.2, 9984670, 'CAD', 'English', null, 45.4215, -75.6972),
('France', 'FR', 'Europe', 'Paris', 67.4, 643801, 'EUR', 'French', null, 48.8566, 2.3522),
('Germany', 'DE', 'Europe', 'Berlin', 83.2, 357114, 'EUR', 'German', null, 52.5200, 13.4050),
('Japan', 'JP', 'Asia', 'Tokyo', 125.8, 377975, 'JPY', 'Japanese', null, 35.6762, 139.6503),
('Australia', 'AU', 'Oceania', 'Canberra', 25.7, 7692024, 'AUD', 'English', null, -35.2809, 149.1300),
('Brazil', 'BR', 'South America', 'Brasília', 215.3, 8515767, 'BRL', 'Portuguese', null, -15.8267, -47.9218),
('Egypt', 'EG', 'Africa', 'Cairo', 104.3, 1001449, 'EGP', 'Arabic', null, 30.0444, 31.2357),
('India', 'IN', 'Asia', 'New Delhi', 1380.0, 3287263, 'INR', 'Hindi', null, 28.6139, 77.2090),
('United Kingdom', 'GB', 'Europe', 'London', 67.9, 243610, 'GBP', 'English', null, 51.5074, -0.1278);

-- Insert points of interest
INSERT INTO public.points_of_interest (iso2, poi_type, name, description, lat, lon) VALUES
('US', 'landmark', 'Statue of Liberty', 'A giant statue welcoming people to New York City!', 40.6892, -74.0445),
('US', 'mountain', 'Mount Denali', 'The tallest mountain in North America.', 63.0692, -151.0070),
('US', 'forest', 'Yellowstone National Park', 'Home to amazing geysers and wildlife.', 44.4280, -110.5885),
('CA', 'landmark', 'CN Tower', 'A super tall tower you can see from space!', 43.6426, -79.3871),
('CA', 'mountain', 'Mount Logan', 'The highest peak in Canada.', 60.5672, -140.4055),
('CA', 'forest', 'Boreal Forest', 'A magical forest full of pine trees.', 60.0000, -95.0000),
('FR', 'landmark', 'Eiffel Tower', 'The most famous tower in the world!', 48.8584, 2.2945),
('FR', 'mountain', 'Mont Blanc', 'A snowy mountain on the border with Italy.', 45.8326, 6.8652),
('FR', 'forest', 'Forest of Fontainebleau', 'A beautiful forest near Paris.', 48.4000, 2.7000),
('DE', 'landmark', 'Brandenburg Gate', 'A historic gate in the heart of Berlin.', 52.5163, 13.3777),
('DE', 'mountain', 'Zugspitze', 'Germany\'s highest mountain.', 47.4211, 10.9853),
('DE', 'forest', 'Black Forest', 'A dark, mysterious forest famous for fairy tales.', 48.0000, 8.0000),
('JP', 'landmark', 'Mount Fuji', 'A beautiful volcano and Japan\'s sacred mountain.', 35.3606, 138.7274),
('JP', 'mountain', 'Mount Fuji', 'Japan\'s tallest and most famous mountain.', 35.3606, 138.7274),
('JP', 'forest', 'Aokigahara Forest', 'A dense, green forest at the base of Mount Fuji.', 35.4731, 138.6200),
('AU', 'landmark', 'Sydney Opera House', 'A building that looks like giant white shells!', -33.8568, 151.2153),
('AU', 'mountain', 'Mount Kosciuszko', 'Australia\'s highest mountain.', -36.4560, 148.2634),
('AU', 'forest', 'Daintree Rainforest', 'One of the world\'s oldest rainforests.', -16.1700, 145.4000),
('BR', 'landmark', 'Christ the Redeemer', 'A giant statue watching over Rio de Janeiro.', -22.9519, -43.2105),
('BR', 'mountain', 'Pico da Neblina', 'Brazil\'s highest mountain.', 0.8037, -66.0097),
('BR', 'forest', 'Amazon Rainforest', 'The biggest rainforest in the world!', -3.4653, -62.2159),
('EG', 'landmark', 'Great Pyramid of Giza', 'Ancient pyramids built by the pharaohs!', 29.9792, 31.1342),
('EG', 'mountain', 'Mount Catherine', 'Egypt\'s highest mountain in the Sinai.', 28.5094, 33.9492),
('EG', 'forest', 'Wadi El Gemal', 'A protected area with rare plants.', 24.0000, 35.0000),
('IN', 'landmark', 'Taj Mahal', 'A beautiful white palace built for love.', 27.1751, 78.0421),
('IN', 'mountain', 'Kangchenjunga', 'The third highest mountain in the world.', 27.7025, 88.1475),
('IN', 'forest', 'Western Ghats', 'Mountains covered in lush green forests.', 15.0000, 75.0000),
('GB', 'landmark', 'Big Ben', 'A famous clock tower in London.', 51.4994, -0.1245),
('GB', 'mountain', 'Ben Nevis', 'The highest mountain in Scotland.', 56.7969, -5.0037),
('GB', 'forest', 'Sherwood Forest', 'The legendary home of Robin Hood.', 53.2000, -1.0667);