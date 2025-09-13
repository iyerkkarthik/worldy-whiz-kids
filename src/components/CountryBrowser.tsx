import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Search, Filter, Volume2, ChevronDown, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Country {
  id: string;
  country_name: string;
  iso2: string;
  continent: string;
  capital: string;
  population_millions: number;
  area_km2: number;
  flag_image_url?: string;
  poi_count?: number;
}

interface CountryBrowserProps {
  selectedContinent: string | null;
  onBack: () => void;
  onCountrySelect: (country: Country) => void;
}

const continentColors: Record<string, string> = {
  "Africa": "bg-continent-africa",
  "Asia": "bg-continent-asia", 
  "Europe": "bg-continent-europe",
  "North America": "bg-continent-north-america",
  "South America": "bg-continent-south-america",
  "Oceania": "bg-continent-oceania",
};

export default function CountryBrowser({ selectedContinent, onBack, onCountrySelect }: CountryBrowserProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [capitalFilter, setCapitalFilter] = useState("");
  const [poiFilter, setPOIFilter] = useState<"all" | "has-poi" | "no-poi">("all");
  const [continentFilter, setContinentFilter] = useState<string>(selectedContinent || "all");
  const [sortBy, setSortBy] = useState<"name" | "population" | "area">("name");
  const [isLoading, setIsLoading] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    fetchCountries();
  }, [selectedContinent]);

  useEffect(() => {
    filterAndSortCountries();
  }, [countries, searchTerm, capitalFilter, poiFilter, continentFilter, sortBy]);

  useEffect(() => {
    setContinentFilter(selectedContinent || "all");
  }, [selectedContinent]);

  const fetchCountries = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("countries")
        .select(`
          *,
          poi_count:points_of_interest(count)
        `);
      
      if (error) throw error;
      
      // Transform the data to flatten poi_count
      const transformedData = (data || []).map(country => ({
        ...country,
        poi_count: country.poi_count?.[0]?.count || 0
      }));
      
      setCountries(transformedData);
    } catch (error) {
      console.error("Error fetching countries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortCountries = () => {
    let filtered = countries.filter(country => {
      // Search filter
      const matchesSearch = country.country_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Capital filter
      const matchesCapital = country.capital?.toLowerCase().includes(capitalFilter.toLowerCase()) ?? true;
      
      // POI filter
      const matchesPOI = poiFilter === "all" || 
        (poiFilter === "has-poi" && (country.poi_count || 0) > 0) ||
        (poiFilter === "no-poi" && (country.poi_count || 0) === 0);
      
      // Continent filter
      const matchesContinent = continentFilter === "all" || country.continent === continentFilter;
      
      return matchesSearch && matchesCapital && matchesPOI && matchesContinent;
    });

    // Sort countries
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "population":
          return (b.population_millions || 0) - (a.population_millions || 0);
        case "area":
          return (b.area_km2 || 0) - (a.area_km2 || 0);
        default:
          return a.country_name.localeCompare(b.country_name);
      }
    });

    setFilteredCountries(filtered);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCapitalFilter("");
    setPOIFilter("all");
    setContinentFilter("all");
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-4">
          <Button variant="ghost" onClick={onBack} size="lg">
            <ArrowLeft className="mr-2" />
            Back to Continents
          </Button>
          <Button 
            variant="audio" 
            size="icon-lg"
            onClick={() => speakText(`Exploring ${selectedContinent || "all"} countries`)}
          >
            <Volume2 />
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-kid-3xl font-bold text-foreground mb-4">
            {selectedContinent ? `Explore ${selectedContinent}` : "Explore All Countries"} 🌎
          </h1>
          {selectedContinent && (
            <Badge className={`${continentColors[selectedContinent]} text-white text-lg px-4 py-2`}>
              {selectedContinent}
            </Badge>
          )}
        </div>

        {/* Search and Filter */}
        <Card className="mb-6 shadow-soft">
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Basic Search */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search for a country..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12 text-base"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={sortBy === "name" ? "default" : "outline"}
                    onClick={() => setSortBy("name")}
                  >
                    A-Z
                  </Button>
                  <Button 
                    variant={sortBy === "population" ? "default" : "outline"}
                    onClick={() => setSortBy("population")}
                  >
                    Population
                  </Button>
                  <Button 
                    variant={sortBy === "area" ? "default" : "outline"}
                    onClick={() => setSortBy("area")}
                  >
                    Size
                  </Button>
                </div>
              </div>

              {/* Advanced Filters */}
              <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Advanced Filters
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Capital Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Capital City</label>
                      <Input
                        placeholder="Search by capital..."
                        value={capitalFilter}
                        onChange={(e) => setCapitalFilter(e.target.value)}
                      />
                    </div>

                    {/* POI Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Points of Interest</label>
                      <Select value={poiFilter} onValueChange={(value: "all" | "has-poi" | "no-poi") => setPOIFilter(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Countries</SelectItem>
                          <SelectItem value="has-poi">Has POIs</SelectItem>
                          <SelectItem value="no-poi">No POIs</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Continent Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Continent</label>
                      <Select value={continentFilter} onValueChange={setContinentFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Continents</SelectItem>
                          <SelectItem value="Africa">Africa</SelectItem>
                          <SelectItem value="Asia">Asia</SelectItem>
                          <SelectItem value="Europe">Europe</SelectItem>
                          <SelectItem value="North America">North America</SelectItem>
                          <SelectItem value="South America">South America</SelectItem>
                          <SelectItem value="Oceania">Oceania</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button variant="outline" onClick={clearFilters} size="sm">
                    Clear All Filters
                  </Button>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>

        {/* Countries Grid */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-kid-2xl">Loading amazing countries... 🌍</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCountries.map((country) => (
              <Card 
                key={country.id}
                className="group cursor-pointer transform hover:scale-105 transition-bounce shadow-soft hover:shadow-magical"
                onClick={() => onCountrySelect(country)}
              >
                <CardContent className="p-4 text-center">
                  <div className="relative w-20 h-14 mx-auto mb-4 overflow-hidden rounded-lg shadow-sm bg-muted group-hover:scale-110 transition-transform duration-200">
                    {country.flag_image_url ? (
                      <img
                        src={country.flag_image_url}
                        alt={`${country.country_name} flag`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-2xl">🏳️</div>';
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🏳️</div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {country.country_name}
                  </h3>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Badge className={`${continentColors[country.continent]} text-white`}>
                      {country.continent}
                    </Badge>
                    {(country.poi_count || 0) > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        {country.poi_count} POI{(country.poi_count || 0) > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Capital: {country.capital}
                  </p>
                  <Button variant="continent" size="sm" className="w-full">
                    Explore Country
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredCountries.length === 0 && !isLoading && (
          <Card className="bg-gradient-warm shadow-soft">
            <CardContent className="p-8 text-center">
              <h3 className="text-kid-2xl font-bold text-foreground mb-4">
                No countries found! 🔍
              </h3>
              <p className="text-kid-xl text-foreground">
                Try searching for a different country name.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}