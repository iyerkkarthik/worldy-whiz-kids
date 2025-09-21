# study kit for genius kids
Overview
The single-page app swaps between continent selection, country browsing, deep-dive detail pages, quizzes, and narrated tours by tracking a viewState that decides which feature component to render at any given time.

A playful continent picker highlights each region, lets learners jump straight into tours, and surfaces quiz launchers tailored to individual continents or random challenges.

Country data, filters, and narrated tours are all powered by Supabase queries that load countries plus their points of interest and present them through rich UI control.

Quizzes dynamically gather questions for random, country-specific, or continent-specific sessions by calling the shared QuizGenerator helper before guiding kids through animated progress, feedback, and score summaries.