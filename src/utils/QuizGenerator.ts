import { supabase } from "@/integrations/supabase/client";

export interface Country {
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

export interface PointOfInterest {
  name: string;
  poi_type: string;
  description: string;
}

export interface Question {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export class QuizGenerator {
  private static questionTemplates = {
    country: [
      // Geography Questions
      {
        template: (country: Country, others: Country[]) => ({
          question: `What is the capital of ${country.country_name}?`,
          options: [country.capital, ...others.slice(0, 3).map(c => c.capital)],
          correct: 0,
          explanation: `${country.capital} is the capital city where the government of ${country.country_name} operates!`,
          category: 'Geography',
          difficulty: 'easy' as const
        }),
        weight: 3
      },
      {
        template: (country: Country, others: Country[]) => ({
          question: `Which continent is ${country.country_name} located in?`,
          options: [country.continent, 'Antarctica', 'The Moon', 'Atlantis'],
          correct: 0,
          explanation: `${country.country_name} is part of the beautiful continent of ${country.continent}!`,
          category: 'Geography',
          difficulty: 'easy' as const
        }),
        weight: 3
      },
      {
        template: (country: Country, others: Country[]) => ({
          question: `Which country is larger by area?`,
          options: [
            country.area_km2 > others[0]?.area_km2 ? country.country_name : others[0]?.country_name,
            country.area_km2 > others[0]?.area_km2 ? others[0]?.country_name : country.country_name,
            others[1]?.country_name || 'Narnia',
            others[2]?.country_name || 'Wonderland'
          ],
          correct: 0,
          explanation: `${country.area_km2 > others[0]?.area_km2 ? country.country_name : others[0]?.country_name} covers more land with ${Math.round(country.area_km2 > others[0]?.area_km2 ? country.area_km2 : others[0]?.area_km2 || 0).toLocaleString()} square kilometers!`,
          category: 'Geography',
          difficulty: 'medium' as const
        }),
        weight: 2
      },
      
      // Culture Questions  
      {
        template: (country: Country, others: Country[]) => ({
          question: `What language do most people speak in ${country.country_name}?`,
          options: [
            country.primary_language || 'Unknown',
            others[0]?.primary_language || 'Dragon Language',
            others[1]?.primary_language || 'Robot Beeps',
            others[2]?.primary_language || 'Animal Sounds'
          ],
          correct: 0,
          explanation: `Most people in ${country.country_name} speak ${country.primary_language}! Learning different languages helps us talk to friends around the world!`,
          category: 'Culture',
          difficulty: 'easy' as const
        }),
        weight: 2
      },
      {
        template: (country: Country, others: Country[]) => ({
          question: `What currency (money) is used in ${country.country_name}?`,
          options: [
            country.currency || 'Unknown',
            others[0]?.currency || 'Magic Coins',
            others[1]?.currency || 'Chocolate Money',
            others[2]?.currency || 'Seashells'
          ],
          correct: 0,
          explanation: `People in ${country.country_name} use ${country.currency} to buy things like toys and ice cream!`,
          category: 'Culture',
          difficulty: 'medium' as const
        }),
        weight: 2
      },

      // Population Questions
      {
        template: (country: Country, others: Country[]) => ({
          question: `Which country has more people living in it?`,
          options: [
            country.population_millions > others[0]?.population_millions ? country.country_name : others[0]?.country_name,
            country.population_millions > others[0]?.population_millions ? others[0]?.country_name : country.country_name,
            others[1]?.country_name || 'Toy Land',
            others[2]?.country_name || 'Pet Planet'
          ],
          correct: 0,
          explanation: `${country.population_millions > others[0]?.population_millions ? country.country_name : others[0]?.country_name} has about ${Math.round(country.population_millions > others[0]?.population_millions ? country.population_millions : others[0]?.population_millions || 0)} million people living there!`,
          category: 'Demographics',
          difficulty: 'medium' as const
        }),
        weight: 2
      },

      // Fun Trivia
      {
        template: (country: Country, others: Country[]) => ({
          question: `True or False: ${country.country_name} is in ${country.continent}`,
          options: ['True', 'False', 'Maybe', 'Only on weekends'],
          correct: 0,
          explanation: `That's absolutely true! ${country.country_name} is proudly part of ${country.continent}!`,
          category: 'Trivia',
          difficulty: 'easy' as const
        }),
        weight: 1
      }
    ],

    continent: [
      {
        template: (continent: string, countries: Country[]) => ({
          question: `Which of these countries is located in ${continent}?`,
          options: [
            countries[0]?.country_name,
            'Candy Kingdom',
            'Robot City',
            'Dragon Land'
          ],
          correct: 0,
          explanation: `${countries[0]?.country_name} is indeed located in the amazing continent of ${continent}!`,
          category: 'Geography',
          difficulty: 'easy' as const
        }),
        weight: 3
      },
      {
        template: (continent: string, countries: Country[]) => ({
          question: `What is the capital of ${countries[0]?.country_name}?`,
          options: [
            countries[0]?.capital,
            countries[1]?.capital,
            countries[2]?.capital,
            'Ice Cream City'
          ],
          correct: 0,
          explanation: `${countries[0]?.capital} is the capital city of ${countries[0]?.country_name} in ${continent}!`,
          category: 'Geography',
          difficulty: 'medium' as const
        }),
        weight: 2
      },
      {
        template: (continent: string, countries: Country[]) => ({
          question: `Which continent has countries like ${countries[0]?.country_name} and ${countries[1]?.country_name}?`,
          options: [continent, 'Antarctica', 'The Lost Continent', 'Dinosaur Island'],
          correct: 0,
          explanation: `Both ${countries[0]?.country_name} and ${countries[1]?.country_name} are wonderful countries in ${continent}!`,
          category: 'Geography',
          difficulty: 'easy' as const
        }),
        weight: 2
      },
      {
        template: (continent: string, countries: Country[]) => ({
          question: `How many countries are shown from ${continent} in our explorer?`,
          options: [
            countries.length.toString(),
            (countries.length + 5).toString(),
            (countries.length - 2).toString(),
            'A million!'
          ],
          correct: 0,
          explanation: `We have ${countries.length} amazing countries from ${continent} to explore in our world adventure!`,
          category: 'Trivia',
          difficulty: 'hard' as const
        }),
        weight: 1
      }
    ]
  };

  static async generateCountryQuestions(country: Country, questionCount: number = 5): Promise<Question[]> {
    try {
      // Get other countries from the same continent for realistic distractors
      const { data: sameContinent } = await supabase
        .from("countries")
        .select("*")
        .eq("continent", country.continent)
        .neq("id", country.id)
        .limit(10);

      // Get countries from other continents for variety
      const { data: otherCountries } = await supabase
        .from("countries")
        .select("*")
        .neq("continent", country.continent)
        .limit(5);

      const allOthers = [...(sameContinent || []), ...(otherCountries || [])];

      // Get POIs for landmark questions
      const { data: pois } = await supabase
        .from("points_of_interest")
        .select("*")
        .eq("iso2", country.iso2);

      // Add POI questions if available
      if (pois && pois.length > 0) {
        const landmark = pois.find(poi => poi.poi_type === 'landmark');
        if (landmark) {
          this.questionTemplates.country.push({
            template: (country: Country, others: Country[]) => ({
              question: `What famous landmark can you visit in ${country.country_name}?`,
              options: [landmark.name, 'Candy Castle', 'Dragon Cave', 'Magic School'],
              correct: 0,
              explanation: `${landmark.name} is an amazing landmark in ${country.country_name}! ${landmark.description}`,
              category: 'Landmarks',
              difficulty: 'medium' as const
            }),
            weight: 2
          });
        }
      }

      return this.selectCountryQuestions(questionCount, country, allOthers);
    } catch (error) {
      console.error("Error generating country questions:", error);
      return [];
    }
  }

  static async generateContinentQuestions(continent: string, questionCount: number = 5): Promise<Question[]> {
    try {
      const { data: countries } = await supabase
        .from("countries")
        .select("*")
        .eq("continent", continent)
        .limit(15);

      if (!countries || countries.length === 0) return [];

      // Shuffle countries for variety
      const shuffled = [...countries].sort(() => Math.random() - 0.5);

      return this.selectContinentQuestions(questionCount, continent, shuffled);
    } catch (error) {
      console.error("Error generating continent questions:", error);
      return [];
    }
  }

  private static selectCountryQuestions(count: number, country: Country, others: Country[]): Question[] {
    const templates = this.questionTemplates.country;
    const questions: Question[] = [];
    const usedTemplates = new Set<number>();

    // Create weighted selection pool
    const weightedPool: number[] = [];
    templates.forEach((template, index) => {
      for (let i = 0; i < template.weight; i++) {
        weightedPool.push(index);
      }
    });

    while (questions.length < count && usedTemplates.size < templates.length) {
      const randomIndex = weightedPool[Math.floor(Math.random() * weightedPool.length)];
      
      if (usedTemplates.has(randomIndex)) continue;
      usedTemplates.add(randomIndex);

      const template = templates[randomIndex];
      const question = template.template(country, others);

      // Shuffle options
      const correctAnswer = question.options[question.correct];
      const shuffledOptions = [...question.options].sort(() => Math.random() - 0.5);
      question.options = shuffledOptions;
      question.correct = shuffledOptions.indexOf(correctAnswer);

      questions.push(question);
    }

    return questions;
  }

  private static selectContinentQuestions(count: number, continent: string, countries: Country[]): Question[] {
    const templates = this.questionTemplates.continent;
    const questions: Question[] = [];
    const usedTemplates = new Set<number>();

    // Create weighted selection pool
    const weightedPool: number[] = [];
    templates.forEach((template, index) => {
      for (let i = 0; i < template.weight; i++) {
        weightedPool.push(index);
      }
    });

    while (questions.length < count && usedTemplates.size < templates.length) {
      const randomIndex = weightedPool[Math.floor(Math.random() * weightedPool.length)];
      
      if (usedTemplates.has(randomIndex)) continue;
      usedTemplates.add(randomIndex);

      const template = templates[randomIndex];
      const question = template.template(continent, countries);

      // Shuffle options
      const correctAnswer = question.options[question.correct];
      const shuffledOptions = [...question.options].sort(() => Math.random() - 0.5);
      question.options = shuffledOptions;
      question.correct = shuffledOptions.indexOf(correctAnswer);

      questions.push(question);
    }

    return questions;
  }

  static async generateRandomQuiz(questionCount: number = 5): Promise<Question[]> {
    try {
      // Get random countries from different continents
      const { data: allCountries } = await supabase
        .from("countries")
        .select("*")
        .limit(50);

      if (!allCountries || allCountries.length === 0) return [];

      const randomCountry = allCountries[Math.floor(Math.random() * allCountries.length)];
      const continents = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];
      const randomContinent = continents[Math.floor(Math.random() * continents.length)];

      // Mix country and continent questions
      const countryQuestions = await this.generateCountryQuestions(randomCountry, Math.ceil(questionCount / 2));
      const continentQuestions = await this.generateContinentQuestions(randomContinent, Math.floor(questionCount / 2));

      return [...countryQuestions, ...continentQuestions].slice(0, questionCount);
    } catch (error) {
      console.error("Error generating random quiz:", error);
      return [];
    }
  }
}