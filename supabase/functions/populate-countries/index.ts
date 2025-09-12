import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CountryData {
  country_name: string;
  iso2: string;
  continent: string;
  capital?: string;
  capital_lat?: number;
  capital_lon?: number;
  population_millions?: number;
  area_km2?: number;
  currency?: string;
  primary_language?: string;
  flag_image_url?: string;
}

interface POIData {
  iso2: string;
  name: string;
  poi_type: string;
  lat?: number;
  lon?: number;
  description?: string;
}

async function fetchCountries(): Promise<CountryData[]> {
  const response = await fetch(
    'https://restcountries.com/v3.1/all?fields=name,cca2,region,subregion,capital,capitalInfo,population,area,flags,unMember'
  );
  const data = await response.json();

  const countries: CountryData[] = [];
  
  for (const country of data) {
    const name = country.name?.common;
    const iso2 = country.cca2;
    const region = country.region;
    const subregion = country.subregion;
    const capital = country.capital?.[0] || '';
    const capitalInfo = country.capitalInfo?.latlng || [];
    const population = country.population;
    const area = country.area;
    const flagUrl = country.flags?.png || country.flags?.svg || '';
    const unMember = country.unMember;

    // Only include UN members and observers (Holy See and Palestine)
    if (!unMember && !['VA', 'PS'].includes(iso2)) continue;

    // Normalize continent names
    let continent = region;
    if (region === 'Americas') {
      if (subregion?.includes('South')) {
        continent = 'South America';
      } else if (subregion?.includes('North') || ['Caribbean', 'Central America'].includes(subregion)) {
        continent = 'North America';
      }
    }

    countries.push({
      country_name: name,
      iso2,
      continent,
      capital,
      capital_lat: capitalInfo[0] || null,
      capital_lon: capitalInfo[1] || null,
      population_millions: population ? population / 1000000 : null,
      area_km2: area || null,
      flag_image_url: flagUrl,
    });
  }

  return countries.sort((a, b) => a.country_name.localeCompare(b.country_name));
}

async function runSparqlQuery(query: string): Promise<any[]> {
  const url = 'https://query.wikidata.org/sparql';
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'CountriesApp/1.0',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      query,
      format: 'json'
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`SPARQL query failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results.bindings;
}

async function fetchLandmarks(): Promise<POIData[]> {
  const query = `
    SELECT ?country ?iso2 ?item ?itemLabel ?coord WHERE {
      ?country wdt:P31 wd:Q6256.
      ?country wdt:P297 ?iso2.
      ?item wdt:P17 ?country.
      ?item wdt:P31/wdt:P279* ?class .
      VALUES ?class { wd:Q570116 wd:Q9259 wd:Q4989906 wd:Q839954 }
      OPTIONAL { ?item wdt:P625 ?coord. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT 500
  `;

  try {
    const results = await runSparqlQuery(query);
    const landmarks: POIData[] = [];

    for (const result of results) {
      const iso2 = result.iso2?.value;
      const name = result.itemLabel?.value;
      const coord = result.coord?.value;

      if (!iso2 || !name) continue;

      let lat, lon;
      if (coord && coord.startsWith('Point(')) {
        const coords = coord.slice(6, -1).split(' ');
        lon = parseFloat(coords[0]);
        lat = parseFloat(coords[1]);
      }

      landmarks.push({
        iso2,
        name,
        poi_type: 'landmark',
        lat: lat || null,
        lon: lon || null,
        description: `Famous landmark in the country`,
      });
    }

    return landmarks;
  } catch (error) {
    console.error('Error fetching landmarks:', error);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Fetching countries data...');
    const countries = await fetchCountries();
    console.log(`Found ${countries.length} countries`);

    console.log('Fetching landmarks data...');
    const landmarks = await fetchLandmarks();
    console.log(`Found ${landmarks.length} landmarks`);

    // Insert countries
    const { error: countriesError } = await supabaseClient
      .from('countries')
      .upsert(countries, { onConflict: 'iso2' });

    if (countriesError) {
      throw new Error(`Failed to insert countries: ${countriesError.message}`);
    }

    // Insert landmarks
    if (landmarks.length > 0) {
      const { error: poisError } = await supabaseClient
        .from('points_of_interest')
        .upsert(landmarks, { onConflict: 'iso2,name' });

      if (poisError) {
        throw new Error(`Failed to insert POIs: ${poisError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully populated ${countries.length} countries and ${landmarks.length} points of interest`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});