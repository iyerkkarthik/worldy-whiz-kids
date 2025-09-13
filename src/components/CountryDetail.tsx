import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Volume2, MapPin, Mountain, Trees, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Country {
  id: string;
  country_name: string;
  iso2: string;
  continent: string;
  capital: string;
  population_millions: number;
  area_km2: number;
  currency: string;
  primary_language: string;
  capital_lat: number;
  capital_lon: number;
  flag_image_url?: string;
}

interface PointOfInterest {
  id: string;
  poi_type: string;
  name: string;
  description: string;
  lat?: number;
  lon?: number;
  image_url?: string;
}

interface CountryDetailProps {
  country: Country;
  onBack: () => void;
  onQuizStart: (country: Country) => void;
}

const continentColors: Record<string, string> = {
  "Africa": "bg-continent-africa",
  "Asia": "bg-continent-asia", 
  "Europe": "bg-continent-europe",
  "North America": "bg-continent-north-america",
  "South America": "bg-continent-south-america",
  "Oceania": "bg-continent-oceania",
};

const poiIcons: Record<string, any> = {
  landmark: Star,
  mountain: Mountain,
  forest: Trees,
};

export default function CountryDetail({ country, onBack, onQuizStart }: CountryDetailProps) {
  const [pois, setPois] = useState<PointOfInterest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPointsOfInterest();
  }, [country.iso2]);

  const fetchPointsOfInterest = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("points_of_interest")
        .select("*")
        .eq("iso2", country.iso2);
      
      if (error) throw error;
      setPois(data || []);
    } catch (error) {
      console.error("Error fetching points of interest:", error);
    } finally {
      setIsLoading(false);
    }
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

  const speakCountryInfo = () => {
    const text = `
      ${country.country_name} is a country in ${country.continent}. 
      The capital city is ${country.capital}. 
      ${country.population_millions ? `It has about ${Math.round(country.population_millions)} million people.` : ""}
      ${country.primary_language ? `The main language is ${country.primary_language}.` : ""}
    `;
    speakText(text);
  };

  const formatNumber = (num: number | null) => {
    if (!num) return "Unknown";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const funFacts = [
    `${country.country_name} is located in ${country.continent}!`,
    `The capital city ${country.capital} is where the government works.`,
    country.currency ? `People use ${country.currency} as money here.` : null,
    country.primary_language ? `Most people speak ${country.primary_language}.` : null,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-4">
          <Button variant="ghost" onClick={onBack} size="lg">
            <ArrowLeft className="mr-2" />
            Back
          </Button>
          <Button 
            variant="audio" 
            size="icon-lg"
            onClick={speakCountryInfo}
            className="animate-scale-bounce"
          >
            <Volume2 />
          </Button>
        </div>

        {/* Country Hero */}
        <Card className="mb-6 shadow-magical bg-gradient-hero text-white">
          <CardContent className="p-8 text-center">
            <div className="mb-4">
              {country.flag_image_url ? (
                <img 
                  src={country.flag_image_url} 
                  alt={`Flag of ${country.country_name}`}
                  className="w-32 h-20 object-cover rounded-lg mx-auto shadow-lg border-2 border-white/20"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                    if (nextElement) nextElement.style.display = 'block';
                  }}
                />
              ) : null}
              <div className={`text-8xl ${country.flag_image_url ? 'hidden' : 'block'}`}>🏳️</div>
            </div>
            <h1 className="text-kid-3xl font-bold mb-4">
              {country.country_name}
            </h1>
            <Badge className={`${continentColors[country.continent]} text-white text-xl px-6 py-2 mb-4`}>
              {country.continent}
            </Badge>
            <div className="flex flex-wrap justify-center gap-6 text-lg">
              <div className="flex items-center">
                <MapPin className="mr-2" />
                Capital: {country.capital}
              </div>
              {country.population_millions && (
                <div>👥 {formatNumber(country.population_millions * 1000000)} people</div>
              )}
              {country.area_km2 && (
                <div>📏 {formatNumber(country.area_km2)} km²</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Facts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-kid-xl font-bold text-center">
                🌟 Quick Facts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {country.primary_language && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Language:</span>
                  <span>{country.primary_language}</span>
                </div>
              )}
              {country.currency && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Money:</span>
                  <span>{country.currency}</span>
                </div>
              )}
              <Button
                variant="audio"
                size="sm"
                onClick={() => speakText(funFacts.join(" "))}
                className="w-full"
              >
                <Volume2 className="mr-2" />
                Hear Fun Facts
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-kid-xl font-bold text-center">
                🗺️ Location
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="w-full h-32 bg-gradient-warm rounded-lg flex items-center justify-center mb-4">
                <div className="text-4xl">🗺️</div>
              </div>
              <p className="text-muted-foreground">
                {country.capital} is located at coordinates{" "}
                {country.capital_lat?.toFixed(2)}, {country.capital_lon?.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Points of Interest */}
        {!isLoading && pois.length > 0 && (
          <Card className="mb-6 shadow-soft">
            <CardHeader>
              <CardTitle className="text-kid-2xl font-bold text-center">
                🎯 Amazing Places to Discover
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {pois.map((poi) => {
                  const IconComponent = poiIcons[poi.poi_type] || Star;
                  return (
                    <Card key={poi.id} className="text-center hover:shadow-magical transition-smooth">
                      <CardContent className="p-4">
                        <div className="mb-4">
                          {poi.image_url ? (
                            <img 
                              src={poi.image_url} 
                              alt={poi.name}
                              className="w-20 h-20 rounded-lg object-cover mx-auto shadow-md"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                if (nextElement) nextElement.style.display = 'block';
                              }}
                            />
                          ) : null}
                          <div className={`text-4xl ${poi.image_url ? 'hidden' : 'block'}`}>
                            {poi.poi_type === 'landmark' && '🏛️'}
                            {poi.poi_type === 'mountain' && '⛰️'}
                            {poi.poi_type === 'forest' && '🌲'}
                          </div>
                        </div>
                        <h4 className="font-bold text-lg mb-2">{poi.name}</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {poi.description}
                        </p>
                        <Button
                          variant="audio"
                          size="sm"
                          onClick={() => speakText(`${poi.name}. ${poi.description}`)}
                        >
                          <Volume2 className="mr-1 h-3 w-3" />
                          Listen
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quiz Section */}
        <Card className="bg-gradient-success text-white shadow-magical">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-kid-2xl font-bold mb-4">
              Ready for a Quiz About {country.country_name}?
            </h3>
            <p className="text-lg mb-6">
              Test what you've learned and earn a special sticker!
            </p>
            <Button
              variant="hero"
              size="xl"
              onClick={() => onQuizStart(country)}
              className="bg-white text-primary hover:bg-white/90"
            >
              Start Quiz Adventure! 🎮
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}