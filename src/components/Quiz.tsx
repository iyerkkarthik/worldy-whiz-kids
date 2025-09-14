import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Volume2, Trophy, Star } from "lucide-react";
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
}

interface PointOfInterest {
  name: string;
  poi_type: string;
  description: string;
}

interface QuizProps {
  country?: Country;
  continent?: string;
  onBack: () => void;
  onComplete: (score: number, total: number) => void;
}

interface Question {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export default function Quiz({ country, continent, onBack, onComplete }: QuizProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showFinalResult, setShowFinalResult] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    generateQuestions();
  }, [country, continent]);

  const generateQuestions = async () => {
    setIsLoading(true);
    try {
      let generatedQuestions: Question[] = [];

      if (country) {
        // Get POIs for this country
        const { data: pois } = await supabase
          .from("points_of_interest")
          .select("*")
          .eq("iso2", country.iso2);

        // Generate country-specific questions
        generatedQuestions = [
          {
            question: `What is the capital of ${country.country_name}?`,
            options: [country.capital, "New York", "London", "Tokyo"].slice(0, 4),
            correct: 0,
            explanation: `${country.capital} is the capital city where the government of ${country.country_name} works!`
          },
          {
            question: `Which continent is ${country.country_name} in?`,
            options: [country.continent, "Antarctica", "Mars", "The Moon"].slice(0, 4),
            correct: 0,
            explanation: `${country.country_name} is located in ${country.continent}!`
          }
        ];

        if (country.primary_language) {
          generatedQuestions.push({
            question: `What language do most people speak in ${country.country_name}?`,
            options: [country.primary_language, "Alien", "Robot", "Animal"].slice(0, 4),
            correct: 0,
            explanation: `Most people in ${country.country_name} speak ${country.primary_language}!`
          });
        }

        if (pois && pois.length > 0) {
          const landmark = pois.find(poi => poi.poi_type === 'landmark');
          if (landmark) {
            generatedQuestions.push({
              question: `What famous place can you visit in ${country.country_name}?`,
              options: [landmark.name, "Candy Castle", "Dragon Cave", "Robot Factory"].slice(0, 4),
              correct: 0,
              explanation: `${landmark.name} is a famous landmark in ${country.country_name}! ${landmark.description}`
            });
          }
        }

      } else if (continent) {
        // Generate continent-specific questions
        const { data: countries } = await supabase
          .from("countries")
          .select("*")
          .eq("continent", continent)
          .limit(10);

        if (countries && countries.length > 0) {
          const randomCountry = countries[Math.floor(Math.random() * countries.length)];
          const otherCountries = countries.filter(c => c.id !== randomCountry.id).slice(0, 3);
          
          generatedQuestions = [
            {
              question: `Which of these countries is in ${continent}?`,
              options: [
                randomCountry.country_name,
                ...otherCountries.map(c => c.country_name)
              ].slice(0, 4),
              correct: 0,
              explanation: `${randomCountry.country_name} is indeed located in ${continent}!`
            },
            {
              question: `What is the capital of ${randomCountry.country_name}?`,
              options: [
                randomCountry.capital,
                ...otherCountries.map(c => c.capital)
              ].slice(0, 4),
              correct: 0,
              explanation: `${randomCountry.capital} is the capital of ${randomCountry.country_name}!`
            }
          ];
        }
      }

      // Shuffle options for each question (except the correct answer position)
      generatedQuestions.forEach(q => {
        const correctAnswer = q.options[q.correct];
        const shuffledOptions = [...q.options];
        
        // Simple shuffle
        for (let i = shuffledOptions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
        }
        
        q.options = shuffledOptions;
        q.correct = shuffledOptions.indexOf(correctAnswer);
      });

      setQuestions(generatedQuestions.slice(0, 3)); // Limit to 3 questions for kids
    } catch (error) {
      console.error("Error generating questions:", error);
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

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
    setShowResult(true);
    
    if (answerIndex === questions[currentQuestion].correct) {
      setScore(score + 1);
      setConfetti(true);
      setTimeout(() => setConfetti(false), 2000);
      speakText("Great job! That's correct!");
    } else {
      speakText("Almost! Let's try to remember for next time.");
    }

    // Auto advance after 3 seconds
    setTimeout(() => {
      if (currentQuestion + 1 < questions.length) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        setShowFinalResult(true);
        onComplete(score + (answerIndex === questions[currentQuestion].correct ? 1 : 0), questions.length);
      }
    }, 3000);
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20 flex items-center justify-center">
        <Card className="shadow-magical">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4 animate-bounce">🎯</div>
            <h2 className="text-kid-2xl font-bold">Preparing Your Quiz...</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showFinalResult) {
    const percentage = Math.round((score / questions.length) * 100);
    const getMessage = () => {
      if (percentage === 100) return "Perfect! You're a geography superstar! 🌟";
      if (percentage >= 70) return "Excellent work! You know your geography! 🎉";
      if (percentage >= 50) return "Good job! Keep exploring to learn more! 👍";
      return "Great try! Every explorer learns something new! 🌍";
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <Card className="bg-gradient-success text-white shadow-magical">
            <CardContent className="p-8 text-center">
              <div className="text-8xl mb-4">🏆</div>
              <h1 className="text-kid-3xl font-bold mb-4">Quiz Complete!</h1>
              <div className="text-kid-2xl mb-6">
                You scored {score} out of {questions.length}!
              </div>
              <p className="text-xl mb-8">{getMessage()}</p>
              
              <div className="flex justify-center gap-4">
                <Button 
                  variant="hero" 
                  size="lg"
                  onClick={onBack}
                  className="bg-white text-primary hover:bg-white/90"
                >
                  <ArrowLeft className="mr-2" />
                  Explore More
                </Button>
                <Button 
                  variant="audio"
                  size="icon-lg"
                  onClick={() => speakText(getMessage())}
                >
                  <Volume2 />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Safety check: ensure we have questions and valid current question
  if (!questions.length || !questions[currentQuestion]) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20 flex items-center justify-center">
        <Card className="shadow-magical">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">❓</div>
            <h2 className="text-kid-2xl font-bold">No questions available</h2>
            <Button variant="outline" onClick={onBack} className="mt-4">
              <ArrowLeft className="mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBack} size="lg">
            <ArrowLeft className="mr-2" />
            Exit Quiz
          </Button>
          <Button 
            variant="audio" 
            size="icon-lg"
            onClick={() => speakText(currentQ.question)}
          >
            <Volume2 />
          </Button>
        </div>

        {/* Progress */}
        <Card className="mb-6 shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span className="text-sm text-muted-foreground">
                Score: {score}/{questions.length}
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </CardContent>
        </Card>

        {/* Question */}
        <Card className="mb-6 shadow-magical">
          <CardHeader>
            <CardTitle className="text-kid-2xl font-bold text-center">
              {currentQ.question}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentQ.options.map((option, index) => (
                <Button
                  key={index}
                  variant={
                    showResult
                      ? index === currentQ.correct
                        ? "quiz"
                        : selectedAnswer === index
                        ? "destructive"
                        : "outline"
                      : "continent"
                  }
                  size="lg"
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showResult}
                  className="h-16 text-lg font-semibold"
                >
                  {option}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Result */}
        {showResult && (
          <Card className={`shadow-magical ${selectedAnswer === currentQ.correct ? 'bg-gradient-success text-white' : 'bg-gradient-warm'}`}>
            <CardContent className="p-6 text-center">
              <div className="text-6xl mb-4">
                {selectedAnswer === currentQ.correct ? '🎉' : '🤔'}
              </div>
              <h3 className="text-kid-xl font-bold mb-4">
                {selectedAnswer === currentQ.correct ? 'Correct! Amazing!' : 'Good try!'}
              </h3>
              <p className="text-lg">{currentQ.explanation}</p>
              {confetti && (
                <div className="text-4xl animate-confetti">🎊✨🎈🌟</div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}