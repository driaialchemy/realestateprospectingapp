export const FAQ_ITEMS = [
  {
    keywords: [
      "what is this",
      "what's this",
      "what does this",
      "what do you do",
      "this site",
      "this app",
      "this dashboard",
      "what is the site",
      "purpose",
      "lead-scoring",
      "lead scoring",
    ],
    answer:
      "This is a lead-scoring dashboard for Arizona real estate agents. It ranks homeowners by estimated equity and how likely they may be to sell, so you can see the strongest contacts first.",
  },
  {
    keywords: [
      "filter",
      "filters",
      "dropdown",
      "slider",
      "relationship",
      "minimum score",
      "min score",
      "how do i find",
      "narrow",
    ],
    answer:
      "On the dashboard, use the Relationship dropdown to show one contact type, and the Minimum score slider to hide lower-ranked leads. Both sit at the top of the page next to the title.",
  },
  {
    keywords: [
      "what does the score",
      "what is the score",
      "what's the score",
      "propensity",
      "how is the score",
      "how the score",
      "score mean",
      "0-100",
      "0 to 100",
    ],
    answer:
      "The score is a 0–100 propensity-to-sell number. It is built from four facts: estimated home equity, years in the home, recent ZIP-code value trend, and CRM engagement. Higher usually means a stronger near-term prospect in this demo.",
  },
  {
    keywords: [
      "top reason",
      "why this lead",
      "explanation",
      "reasons",
      "why this",
    ],
    answer:
      "Top reason and Why this lead are short summaries of the facts behind that contact’s score. They come from pre-computed structured data, not from an AI making up a story.",
  },
  {
    keywords: [
      "real client",
      "real data",
      "real people",
      "pii",
      "synthetic",
      "demo",
      "privacy",
      "actual client",
      "live scoring",
      "authentication",
      "fake",
    ],
    answer:
      "This is a synthetic-data demo, not real client records. There is no authentication and no live scoring, so do not load real client PII into this MVP.",
  },
  {
    keywords: [
      "enter",
      "landing",
      "get to the dashboard",
      "open the dashboard",
      "how do i start",
      "how do i get in",
      "go to the dashboard",
    ],
    answer:
      "From the landing page, click the Enter button under the title. That takes you to the Prospecting Dashboard.",
  },
];

export const OFF_TOPIC_PHRASES = [
  "how are you",
  "what's up",
  "whats up",
  "good morning",
  "good night",
  "tell me a joke",
  "the weather",
  "who won",
  "recipe",
  "sports",
  "movie",
  "song lyrics",
  "bitcoin",
  "write me a",
  "write a poem",
  "capital of",
];

export const UNKNOWN_ANSWER =
  "I don't know. I can only answer a few questions about this site and how to use the dashboard.";

export const OUTSIDE_ANSWER =
  "That's outside what I can help with here. Ask about this dashboard, the score, filters, or the demo data.";
