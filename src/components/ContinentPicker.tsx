import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, MapPin, Award } from "lucide-react";

interface ContinentPickerProps {
  onContinentSelect: (continent: string | null) => void;
  onQuizStart: () => void;
}

const continents = [
  { name: "Africa", color: "bg-continent-africa", icon: "🦁" },
  { name: "Asia", color: "bg-continent-asia", icon: "🐼" },
  { name: "Europe", color: "bg-continent-europe", icon: "🦊" },
  { name: "North America", color: "bg-continent-north-america", icon: "🐻" },
  { name: "South America", color: "bg-continent-south-america", icon: "🦜" },
  { name: "Oceania", color: "bg-continent-oceania", icon: "🦘" },
];

export default function ContinentPicker({ onContinentSelect, onQuizStart }: ContinentPickerProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-kid-3xl font-bold text-foreground mb-4 animate-bounce">
            Countries of the World! 🌍
          </h1>
          <p className="text-kid-xl text-muted-foreground mb-8">
            Let's explore amazing countries and learn fun facts!
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Button
              variant="hero"
              size="lg"
              onClick={() => onContinentSelect(null)}
              className="min-w-48"
            >
              <Globe className="mr-2" />
              Explore All Countries
            </Button>
            <Button
              variant="quiz"
              size="lg"
              onClick={onQuizStart}
              className="min-w-48"
            >
              <Award className="mr-2" />
              Start Quiz Adventure
            </Button>
          </div>
        </div>

        {/* Continents Grid */}
        <div className="mb-8">
          <h2 className="text-kid-2xl font-bold text-center mb-6 text-foreground">
            Choose a Continent to Explore
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {continents.map((continent) => (
              <Card 
                key={continent.name}
                className="group cursor-pointer transform hover:scale-105 transition-bounce shadow-soft hover:shadow-magical"
                onClick={() => onContinentSelect(continent.name)}
              >
                <CardContent className="p-6 text-center">
                  <div className={`w-20 h-20 ${continent.color} rounded-full mx-auto mb-4 flex items-center justify-center text-4xl group-hover:animate-wiggle`}>
                    {continent.icon}
                  </div>
                  <h3 className="text-kid-xl font-bold text-foreground mb-2">
                    {continent.name}
                  </h3>
                  <Button variant="continent" size="sm" className="mt-2">
                    <MapPin className="mr-1 h-4 w-4" />
                    Explore
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Fun Facts Section */}
        <Card className="bg-gradient-warm shadow-magical">
          <CardContent className="p-6 text-center">
            <h3 className="text-kid-2xl font-bold text-foreground mb-4">
              Did You Know? 🤔
            </h3>
            <p className="text-kid-xl text-foreground">
              There are 195 countries in the world, and each one has its own special flag, 
              capital city, and amazing landmarks to discover!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}