import { useState } from "react";
// import { Helmet } from "react-helmet-async";
import ContinentPicker from "@/components/ContinentPicker";
import CountryBrowser from "@/components/CountryBrowser";
import CountryDetail from "@/components/CountryDetail";
import Quiz from "@/components/Quiz";
import heroEarth from "@/assets/hero-earth.jpg";

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
}

type ViewState = 
  | { type: "home" }
  | { type: "browser"; continent: string | null }
  | { type: "country"; country: Country }
  | { type: "quiz"; country?: Country; continent?: string };

const Index = () => {
  const [viewState, setViewState] = useState<ViewState>({ type: "home" });

  const handleContinentSelect = (continent: string | null) => {
    setViewState({ type: "browser", continent });
  };

  const handleCountrySelect = (country: Country) => {
    setViewState({ type: "country", country });
  };

  const handleQuizStart = (country?: Country, continent?: string) => {
    setViewState({ type: "quiz", country, continent });
  };

  const handleBack = () => {
    setViewState({ type: "home" });
  };

  const handleBackToBrowser = () => {
    if (viewState.type === "country") {
      setViewState({ type: "browser", continent: viewState.country.continent });
    } else {
      setViewState({ type: "home" });
    }
  };

  const handleQuizComplete = (score: number, total: number) => {
    // Store quiz results in localStorage for progress tracking
    const results = JSON.parse(localStorage.getItem("quiz-results") || "[]");
    results.push({
      date: new Date().toISOString(),
      score,
      total,
      country: viewState.type === "quiz" && viewState.country ? viewState.country.country_name : null,
      continent: viewState.type === "quiz" && viewState.continent ? viewState.continent : null,
    });
    localStorage.setItem("quiz-results", JSON.stringify(results));
  };

  return (
    <div>
      {/* TODO: Add Helmet for SEO when react-helmet-async is installed */}

      <main className="min-h-screen">
        {viewState.type === "home" && (
          <ContinentPicker
            onContinentSelect={handleContinentSelect}
            onQuizStart={() => handleQuizStart()}
          />
        )}

        {viewState.type === "browser" && (
          <CountryBrowser
            selectedContinent={viewState.continent}
            onBack={handleBack}
            onCountrySelect={handleCountrySelect}
          />
        )}

        {viewState.type === "country" && (
          <CountryDetail
            country={viewState.country}
            onBack={handleBackToBrowser}
            onQuizStart={(country) => handleQuizStart(country)}
          />
        )}

        {viewState.type === "quiz" && (
          <Quiz
            country={viewState.country}
            continent={viewState.continent}
            onBack={handleBack}
            onComplete={handleQuizComplete}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
