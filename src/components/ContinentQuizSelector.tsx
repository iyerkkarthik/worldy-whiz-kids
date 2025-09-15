import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Brain } from "lucide-react";

interface ContinentQuizSelectorProps {
  onContinentQuizStart: (continent: string) => void;
  onRandomQuizStart: () => void;
}

const continents = [
  { name: "Africa", icon: "🦁", color: "bg-continent-africa" },
  { name: "Asia", icon: "🐼", color: "bg-continent-asia" },
  { name: "Europe", icon: "🦊", color: "bg-continent-europe" },
  { name: "North America", icon: "🐻", color: "bg-continent-north-america" },
  { name: "South America", icon: "🦜", color: "bg-continent-south-america" },
  { name: "Oceania", icon: "🦘", color: "bg-continent-oceania" },
];

export default function ContinentQuizSelector({ onContinentQuizStart, onRandomQuizStart }: ContinentQuizSelectorProps) {
  const [open, setOpen] = useState(false);

  const handleContinentSelect = (continent: string) => {
    setOpen(false);
    onContinentQuizStart(continent);
  };

  return (
    <div className="flex gap-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="quiz" size="lg" className="min-w-48">
            <Award className="mr-2" />
            Continent Quiz
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-kid-2xl">Choose a Continent to Quiz About! 🌍</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4">
            {continents.map((continent) => (
              <Card 
                key={continent.name}
                className="cursor-pointer hover:scale-105 transition-transform shadow-soft hover:shadow-magical"
                onClick={() => handleContinentSelect(continent.name)}
              >
                <CardContent className="p-4 text-center">
                  <div className={`w-16 h-16 ${continent.color} rounded-full mx-auto mb-2 flex items-center justify-center text-3xl`}>
                    {continent.icon}
                  </div>
                  <h3 className="text-kid-lg font-bold text-foreground">
                    {continent.name}
                  </h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Button
        variant="outline"
        size="lg"
        onClick={onRandomQuizStart}
        className="min-w-48 border-2 border-primary text-primary hover:bg-primary hover:text-white"
      >
        <Brain className="mr-2" />
        Random World Quiz
      </Button>
    </div>
  );
}