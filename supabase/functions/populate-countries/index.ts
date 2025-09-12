import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CountryData {
  country_name: string;
  iso2: string;
  iso3?: string;
  continent: string;
  subregion?: string;
  capital?: string;
  capital_lat?: number;
  capital_lon?: number;
  center_lat?: number;
  center_lon?: number;
  population_millions?: number;
  area_km2?: number;
  currency?: string;
  primary_language?: string;
  flag_image_url?: string;
  un_member?: boolean;
}

interface POIData {
  iso2: string;
  name: string;
  poi_type: string;
  lat?: number;
  lon?: number;
  description?: string;
  extra?: string;
}

async function fetchCountries(): Promise<CountryData[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);
  
  try {
    console.log('Making request to REST Countries API...');
    const response = await fetch(
      'https://restcountries.com/v3.1/all?fields=name,cca2,cca3,region,subregion,capital,capitalInfo,latlng,population,area,flags,unMember,independent,status',
      { 
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
  
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`REST Countries API error - Status: ${response.status}, StatusText: ${response.statusText}, Body: ${errorText}`);
      throw new Error(`REST Countries API failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`Fetched data for ${data.length} countries from REST Countries API`);

    const countries: CountryData[] = [];
    
    for (const country of data) {
      const name = country.name?.common;
      const iso2 = country.cca2;
      const iso3 = country.cca3;
      const region = country.region;
      const subregion = country.subregion;
      const capital = country.capital?.[0] || '';
      const capitalInfo = country.capitalInfo?.latlng || [];
      const centerLatLng = country.latlng || [];
      const population = country.population;
      const area = country.area;
      const flagUrl = country.flags?.png || country.flags?.svg || '';
      const unMember = country.unMember;

      if (!name || !iso2) continue;

      // Only include UN members and observers (Holy See and Palestine) = 195 total
      const observers = ['VA', 'PS'];
      if (!unMember && !observers.includes(iso2)) continue;

      // Normalize continent names - split Americas into North/South
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
        iso3,
        continent,
        subregion,
        capital,
        capital_lat: capitalInfo[0] || null,
        capital_lon: capitalInfo[1] || null,
        center_lat: centerLatLng[0] || null,
        center_lon: centerLatLng[1] || null,
        population_millions: population ? population / 1000000 : null,
        area_km2: area || null,
        flag_image_url: flagUrl,
        un_member: unMember || observers.includes(iso2),
      });
    }

    console.log(`Processed ${countries.length} countries (UN members + observers)`);
    return countries.sort((a, b) => a.country_name.localeCompare(b.country_name));
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function runSparqlQuery(query: string, retries: number = 3): Promise<any[]> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      const params = new URLSearchParams({
        query,
        format: 'json'
      });
      
      const response = await fetch(`https://query.wikidata.org/sparql?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`SPARQL query error - Status: ${response.status}, StatusText: ${response.statusText}, Body: ${errorText}`);
        throw new Error(`SPARQL query failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.results.bindings;
    } catch (error) {
      console.error(`SPARQL query attempt ${attempt} failed:`, error);
      if (attempt === retries) {
        throw error;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
  return [];
}

function parsePointWKT(wkt: string): { lat: number | null, lon: number | null } {
  try {
    if (wkt && wkt.startsWith('Point(') && wkt.endsWith(')')) {
      const coords = wkt.slice(6, -1).split(' ');
      const lon = parseFloat(coords[0]);
      const lat = parseFloat(coords[1]);
      if (!isNaN(lat) && !isNaN(lon)) {
        return { lat, lon };
      }
    }
  } catch (error) {
    console.error('Error parsing WKT:', error);
  }
  return { lat: null, lon: null };
}

async function fetchTopLandmarksByCountry(): Promise<POIData[]> {
  const query = `
    SELECT ?country ?iso2 ?countryLabel ?item ?itemLabel ?coord ?sitelinks WHERE {
      ?country wdt:P31 wd:Q6256.
      OPTIONAL { ?country wdt:P297 ?iso2. }
      ?item wdt:P17 ?country.
      ?item wdt:P31/wdt:P279* ?class .
      VALUES ?class { wd:Q570116 wd:Q9259 wd:Q4989906 wd:Q839954 }
      OPTIONAL { ?item wdt:P625 ?coord. }
      ?item wikibase:sitelinks ?sitelinks.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
  `;

  try {
    const results = await runSparqlQuery(query);
    console.log(`Fetched ${results.length} landmarks from Wikidata`);
    
    // Group by country and rank by sitelinks
    const countryGroups: { [key: string]: any[] } = {};
    
    for (const result of results) {
      const iso2 = result.iso2?.value;
      const name = result.itemLabel?.value;
      const coord = result.coord?.value;
      const sitelinks = parseInt(result.sitelinks?.value || '0');
      
      if (!iso2 || !name || iso2.length !== 2) continue;
      
      if (!countryGroups[iso2]) countryGroups[iso2] = [];
      
      const { lat, lon } = parsePointWKT(coord);
      
      countryGroups[iso2].push({
        iso2,
        name,
        lat,
        lon,
        sitelinks,
      });
    }
    
    // Get top landmark per country
    const landmarks: POIData[] = [];
    for (const [iso2, items] of Object.entries(countryGroups)) {
      if (items.length > 0) {
        const topLandmark = items.sort((a, b) => b.sitelinks - a.sitelinks)[0];
        landmarks.push({
          iso2: topLandmark.iso2,
          name: topLandmark.name,
          poi_type: 'landmark',
          lat: topLandmark.lat,
          lon: topLandmark.lon,
          description: `Famous landmark`,
          extra: `sitelinks:${topLandmark.sitelinks}`,
        });
      }
    }
    
    return landmarks;
  } catch (error) {
    console.error('Error fetching landmarks:', error);
    return [];
  }
}

async function fetchHighestPointsByCountry(): Promise<POIData[]> {
  const query = `
    SELECT ?country ?iso2 ?countryLabel ?hp ?hpLabel ?coord WHERE {
      ?country wdt:P31 wd:Q6256.
      OPTIONAL { ?country wdt:P297 ?iso2. }
      ?country wdt:P610 ?hp.
      OPTIONAL { ?hp wdt:P625 ?coord. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
  `;

  try {
    const results = await runSparqlQuery(query);
    console.log(`Fetched ${results.length} highest points from Wikidata`);
    
    const highestPoints: POIData[] = [];
    
    for (const result of results) {
      const iso2 = result.iso2?.value;
      const name = result.hpLabel?.value;
      const coord = result.coord?.value;
      
      if (!iso2 || !name || iso2.length !== 2) continue;
      
      const { lat, lon } = parsePointWKT(coord);
      
      highestPoints.push({
        iso2,
        name,
        poi_type: 'mountain',
        lat,
        lon,
        description: `Highest point`,
        extra: '',
      });
    }
    
    return highestPoints;
  } catch (error) {
    console.error('Error fetching highest points:', error);
    return [];
  }
}

async function fetchTopForestsOrParksByCountry(): Promise<POIData[]> {
  const query = `
    SELECT ?country ?iso2 ?countryLabel ?item ?itemLabel ?coord ?sitelinks WHERE {
      ?country wdt:P31 wd:Q6256.
      OPTIONAL { ?country wdt:P297 ?iso2. }
      ?item wdt:P17 ?country.
      ?item wdt:P31/wdt:P279* ?class .
      VALUES ?class { wd:Q4421 wd:Q46169 }
      OPTIONAL { ?item wdt:P625 ?coord. }
      ?item wikibase:sitelinks ?sitelinks.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
  `;

  try {
    const results = await runSparqlQuery(query);
    console.log(`Fetched ${results.length} forests/parks from Wikidata`);
    
    // Group by country and rank by sitelinks
    const countryGroups: { [key: string]: any[] } = {};
    
    for (const result of results) {
      const iso2 = result.iso2?.value;
      const name = result.itemLabel?.value;
      const coord = result.coord?.value;
      const sitelinks = parseInt(result.sitelinks?.value || '0');
      
      if (!iso2 || !name || iso2.length !== 2) continue;
      
      if (!countryGroups[iso2]) countryGroups[iso2] = [];
      
      const { lat, lon } = parsePointWKT(coord);
      
      countryGroups[iso2].push({
        iso2,
        name,
        lat,
        lon,
        sitelinks,
      });
    }
    
    // Get top forest/park per country
    const forestsParks: POIData[] = [];
    for (const [iso2, items] of Object.entries(countryGroups)) {
      if (items.length > 0) {
        const topPark = items.sort((a, b) => b.sitelinks - a.sitelinks)[0];
        forestsParks.push({
          iso2: topPark.iso2,
          name: topPark.name,
          poi_type: 'forest',
          lat: topPark.lat,
          lon: topPark.lon,
          description: `National park or forest`,
          extra: `sitelinks:${topPark.sitelinks}`,
        });
      }
    }
    
    return forestsParks;
  } catch (error) {
    console.error('Error fetching forests/parks:', error);
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

    console.log('Fetching POIs data...');
    const [landmarks, highestPoints, forestsParks] = await Promise.all([
      fetchTopLandmarksByCountry(),
      fetchHighestPointsByCountry(),
      fetchTopForestsOrParksByCountry(),
    ]);
    
    console.log(`Found ${landmarks.length} landmarks, ${highestPoints.length} highest points, ${forestsParks.length} forests/parks`);
    
    // Combine and deduplicate POIs
    const allPois = [...landmarks, ...highestPoints, ...forestsParks];
    const uniquePois = allPois.filter((poi, index, array) => 
      array.findIndex(p => p.iso2 === poi.iso2 && p.poi_type === poi.poi_type && p.name === poi.name) === index
    );
    
    console.log(`Total unique POIs: ${uniquePois.length}`);

    // Insert countries
    const { error: countriesError } = await supabaseClient
      .from('countries')
      .upsert(countries, { onConflict: 'iso2' });

    if (countriesError) {
      throw new Error(`Failed to insert countries: ${countriesError.message}`);
    }

    // Insert POIs
    if (uniquePois.length > 0) {
      const { error: poisError } = await supabaseClient
        .from('points_of_interest')
        .upsert(uniquePois, { onConflict: 'iso2,name' });

      if (poisError) {
        throw new Error(`Failed to insert POIs: ${poisError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully populated ${countries.length} countries and ${uniquePois.length} points of interest (${landmarks.length} landmarks, ${highestPoints.length} highest points, ${forestsParks.length} forests/parks)`,
        data: {
          countries: countries.length,
          landmarks: landmarks.length,
          highest_points: highestPoints.length,
          forests_parks: forestsParks.length,
          total_pois: uniquePois.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in populate-countries function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});