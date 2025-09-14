import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Volume2, Trophy, Star, Shuffle, Brain } from "lucide-react";
import { QuizGenerator, Question, Country } from "@/utils/QuizGenerator";

interface QuizProps {
  country?: Country;
  continent?: string;
  isRandom?: boolean;
  onBack: () => void;
  onComplete: (score: number, total: number) => void;
}

export default function Quiz({ country, continent, isRandom, onBack, onComplete }: QuizProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showFinalResult, setShowFinalResult] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [confetti, setConfetti] = useState(false);
  const [quizType, setQuizType] = useState<string>("");

  useEffect(() => {
    generateQuestions();
  }, [country, continent, isRandom]);

  const generateQuestions = async () => {
    setIsLoading(true);
    try {
      let generatedQuestions: Question[] = [];

      if (isRandom) {
        setQuizType("Random World Quiz");
        generatedQuestions = await QuizGenerator.generateRandomQuiz(5);
      } else if (country) {
        setQuizType(`${country.country_name} Quiz`);
        generatedQuestions = await QuizGenerator.generateCountryQuestions(country, 5);
      } else if (continent) {
        setQuizType(`${continent} Quiz`);
        generatedQuestions = await QuizGenerator.generateContinentQuestions(continent, 5);
      }

      setQuestions(generatedQuestions);
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
            <div className="text-6xl mb-4 animate-bounce">
              {isRandom ? '🌎' : country ? '🏛️' : '🌍'}
            </div>
            <h2 className="text-kid-2xl font-bold">Preparing Your {quizType}...</h2>
            <p className="text-muted-foreground mt-2">Generating amazing questions just for you!</p>
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
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {quizType}
            </Badge>
            <Button 
              variant="audio" 
              size="icon-lg"
              onClick={() => speakText(currentQ.question)}
            >
              <Volume2 />
            </Button>
          </div>
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
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="text-xs">
                {currentQ.category}
              </Badge>
              <Badge 
                variant={currentQ.difficulty === 'easy' ? 'default' : currentQ.difficulty === 'medium' ? 'secondary' : 'destructive'}
                className="text-xs"
              >
                {currentQ.difficulty}
              </Badge>
            </div>
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