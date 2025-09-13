import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Carousel, CarouselContent, CarouselItem, CarouselApi } from "@/components/ui/carousel";
import { Play, Pause, SkipForward, Volume2, VolumeX, ArrowLeft, Settings } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTourAudio } from "@/hooks/useTourAudio";

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
  name: string;
  description: string;
  image_url?: string;
  poi_type: string;
}

interface ContinentTourProps {
  continent: string;
  onBack: () => void;
}

const continentInfo = {
  "Africa": { color: "bg-continent-africa", emoji: "🦁", description: "the cradle of humanity" },
  "Asia": { color: "bg-continent-asia", emoji: "🐼", description: "the largest and most populous continent" },
  "Europe": { color: "bg-continent-europe", emoji: "🦊", description: "the birthplace of Western civilization" },
  "North America": { color: "bg-continent-north-america", emoji: "🐻", description: "land of vast wilderness and innovation" },
  "South America": { color: "bg-continent-south-america", emoji: "🦜", description: "home to the Amazon and ancient civilizations" },
  "Oceania": { color: "bg-continent-oceania", emoji: "🦘", description: "the island continent of unique wildlife" },
};

export default function ContinentTour({ continent, onBack }: ContinentTourProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [pointsOfInterest, setPointsOfInterest] = useState<{ [key: string]: PointOfInterest[] }>({});
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [tourSpeed, setTourSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const { toast } = useToast();

  const {
    isNarrating,
    isSpeechSupported,
    startNarration,
    stopNarration,
    queueNarration
  } = useTourAudio({ isMuted, speed: tourSpeed });

  const tourIntervalRef = useRef<NodeJS.Timeout>();

  const convertImageUrl = (url: string | undefined) => {
    if (!url) return url;
    if (url.includes('commons.wikimedia.org/wiki/')) {
      const filename = url.split('/wiki/')[1];
      if (filename) {
        return `https://commons.wikimedia.org/w/index.php?title=Special:FilePath&file=${encodeURIComponent(filename)}`;
      }
    }
    return url;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)} million`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)} thousand`;
    return num.toString();
  };

  useEffect(() => {
    fetchCountriesAndPOIs();
  }, [continent]);

  useEffect(() => {
    if (!api) return;

    api.on("select", () => {
      setCurrentIndex(api.selectedScrollSnap());
    });
  }, [api]);

  useEffect(() => {
    if (isPlaying && countries.length > 0) {
      startTour();
    } else {
      stopTour();
    }
    return () => stopTour();
  }, [isPlaying, currentIndex, countries.length, tourSpeed]);

  const fetchCountriesAndPOIs = async () => {
    try {
      const { data: countriesData, error: countriesError } = await supabase
        .from("countries")
        .select("*")
        .eq("continent", continent)
        .order("country_name");

      if (countriesError) throw countriesError;

      const { data: poisData, error: poisError } = await supabase
        .from("points_of_interest")
        .select("*")
        .in("iso2", countriesData?.map(c => c.iso2) || []);

      if (poisError) throw poisError;

      const poisByCountry: { [key: string]: PointOfInterest[] } = {};
      poisData?.forEach(poi => {
        if (!poisByCountry[poi.iso2]) {
          poisByCountry[poi.iso2] = [];
        }
        poisByCountry[poi.iso2].push(poi);
      });

      setCountries(countriesData || []);
      setPointsOfInterest(poisByCountry);
    } catch (error) {
      console.error("Error fetching tour data:", error);
      toast({
        title: "Error",
        description: "Failed to load tour data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateNarration = (country: Country, pois: PointOfInterest[]) => {
    const info = continentInfo[continent as keyof typeof continentInfo];
    const topPois = pois.slice(0, 3);
    
    let narration = `Welcome to ${country.country_name}, a beautiful country in ${continent}. `;
    narration += `The capital city is ${country.capital}, and it has a population of ${formatNumber(country.population_millions)} people. `;
    narration += `This country covers an area of ${formatNumber(country.area_km2)} square kilometers. `;
    
    if (topPois.length > 0) {
      narration += `Let's explore some amazing landmarks. `;
      topPois.forEach((poi, index) => {
        narration += `${poi.name} is ${poi.description}. `;
      });
    }
    
    narration += `Thank you for visiting ${country.country_name}. `;
    return narration;
  };

  const startTour = () => {
    if (!isSpeechSupported) {
      toast({
        title: "Audio not supported",
        description: "Your browser doesn't support speech synthesis",
        variant: "destructive",
      });
      return;
    }

    const country = countries[currentIndex];
    const pois = pointsOfInterest[country.iso2] || [];
    const narration = generateNarration(country, pois);
    
    queueNarration(narration, () => {
      // Auto-advance to next country after narration completes
      if (currentIndex < countries.length - 1) {
        api?.scrollNext();
      } else {
        // Tour completed
        setIsPlaying(false);
        toast({
          title: "Tour Completed! 🎉",
          description: `You've explored all ${countries.length} countries in ${continent}`,
        });
      }
    });
  };

  const stopTour = () => {
    if (tourIntervalRef.current) {
      clearTimeout(tourIntervalRef.current);
    }
    stopNarration();
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const skipToNext = () => {
    if (currentIndex < countries.length - 1) {
      api?.scrollNext();
    }
  };

  const skipToPrevious = () => {
    if (currentIndex > 0) {
      api?.scrollPrev();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-kid-xl text-muted-foreground">Preparing your tour of {continent}...</p>
        </div>
      </div>
    );
  }

  if (countries.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <p className="text-kid-xl text-muted-foreground mb-4">No countries found for {continent}</p>
            <Button onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentCountry = countries[currentIndex];
  const currentPois = pointsOfInterest[currentCountry.iso2] || [];
  const info = continentInfo[continent as keyof typeof continentInfo];
  const progress = ((currentIndex + 1) / countries.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Exit Tour
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{info.emoji}</span>
              <h1 className="text-kid-xl font-bold">
                {continent} Tour
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} of {countries.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <Progress value={progress} className="h-1" />
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="max-w-6xl mx-auto px-4 py-3 bg-muted/50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Speed:</label>
              <select
                value={tourSpeed}
                onChange={(e) => setTourSpeed(Number(e.target.value))}
                className="px-2 py-1 rounded border text-sm"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Carousel
          setApi={setApi}
          className="w-full"
          opts={{
            align: "start",
            loop: false,
          }}
        >
          <CarouselContent>
            {countries.map((country, index) => {
              const pois = pointsOfInterest[country.iso2] || [];
              const topPois = pois.slice(0, 3);
              
              return (
                <CarouselItem key={country.id}>
                  <Card className="overflow-hidden shadow-magical">
                    <CardContent className="p-0">
                      {/* Country Header */}
                      <div className={`${info.color} p-8 text-center text-white`}>
                        <div className="flex justify-center mb-4">
                          {country.flag_image_url ? (
                            <img
                              src={country.flag_image_url}
                              alt={`${country.country_name} flag`}
                              className="w-24 h-16 object-cover rounded-lg shadow-lg"
                            />
                          ) : (
                            <div className="w-24 h-16 bg-white/20 rounded-lg flex items-center justify-center">
                              🏳️
                            </div>
                          )}
                        </div>
                        <h2 className="text-kid-3xl font-bold mb-2">{country.country_name}</h2>
                        <p className="text-kid-xl opacity-90">Capital: {country.capital}</p>
                      </div>

                      {/* Country Stats */}
                      <div className="p-6 bg-gradient-warm">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                          <div>
                            <p className="text-2xl font-bold text-foreground">{formatNumber(country.population_millions)}</p>
                            <p className="text-sm text-muted-foreground">Population</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">{formatNumber(country.area_km2)} km²</p>
                            <p className="text-sm text-muted-foreground">Area</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">{country.currency}</p>
                            <p className="text-sm text-muted-foreground">Currency</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">{country.primary_language}</p>
                            <p className="text-sm text-muted-foreground">Language</p>
                          </div>
                        </div>
                      </div>

                      {/* Points of Interest */}
                      {topPois.length > 0 && (
                        <div className="p-6">
                          <h3 className="text-kid-2xl font-bold text-center mb-6">
                            Amazing Places to Visit
                          </h3>
                          <div className="grid gap-6">
                            {topPois.map((poi) => (
                              <div key={poi.id} className="flex gap-4 p-4 bg-muted/30 rounded-lg">
                                <div className="flex-shrink-0">
                                  {poi.image_url ? (
                                    <img
                                      src={convertImageUrl(poi.image_url)}
                                      alt={poi.name}
                                      className="w-20 h-20 rounded-lg object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-20 h-20 bg-primary/20 rounded-lg flex items-center justify-center text-2xl">
                                      🏛️
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-bold text-foreground mb-1">{poi.name}</h4>
                                  <p className="text-sm text-muted-foreground">{poi.description}</p>
                                  <span className="inline-block mt-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                                    {poi.poi_type}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
      </div>

      {/* Controls */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-20">
        <Card className="shadow-magical">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={skipToPrevious}
                disabled={currentIndex === 0}
              >
                <SkipForward className="h-4 w-4 rotate-180" />
              </Button>
              
              <Button
                onClick={togglePlay}
                size="lg"
                className="min-w-24"
                disabled={!isSpeechSupported}
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-5 w-5 mr-2" />
                    {isNarrating ? "Speaking..." : "Pause"}
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Start Tour
                  </>
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={skipToNext}
                disabled={currentIndex === countries.length - 1}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}