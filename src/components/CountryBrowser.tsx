import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Filter, Volume2 } from "lucide-react";
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
  const [sortBy, setSortBy] = useState<"name" | "population" | "area">("name");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCountries();
  }, [selectedContinent]);

  useEffect(() => {
    filterAndSortCountries();
  }, [countries, searchTerm, sortBy]);

  const fetchCountries = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from("countries").select("*");
      
      if (selectedContinent) {
        query = query.eq("continent", selectedContinent);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setCountries(data || []);
    } catch (error) {
      console.error("Error fetching countries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortCountries = () => {
    let filtered = countries.filter(country =>
      country.country_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                  <div className="w-20 h-20 bg-gradient-warm rounded-full mx-auto mb-4 flex items-center justify-center text-4xl group-hover:animate-wiggle">
                    🏳️
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {country.country_name}
                  </h3>
                  <Badge className={`${continentColors[country.continent]} text-white mb-2`}>
                    {country.continent}
                  </Badge>
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