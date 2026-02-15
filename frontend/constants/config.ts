// Kriya App Configuration

export const Config = {
  // App info
  appName: "Kriya",
  appVersion: "1.0.0",

  // API
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",

  // Environment
  isDev: process.env.EXPO_PUBLIC_APP_ENV === "development",
  isProd: process.env.EXPO_PUBLIC_APP_ENV === "production",

  // Defaults
  defaultCity: "Bangalore",
  defaultLanguage: "english",

  // Limits
  maxGigApplicationMessage: 500,
  maxBioLength: 300,
  maxGigDescription: 2000,

  // Momentum
  momentum: {
    gigCompletion: 50,
    posterCompletion: 30,
    fiveStarBonus: 20,
    fourStarBonus: 10,
    noShowPenalty: -100,
    leftEarlyPenalty: -50,
    boostLevel1Cost: 50,
    boostLevel2Cost: 150,
    boostLevel3Cost: 400,
  },

  // Location
  defaultSearchRadiusKm: 50,
  maxSearchRadiusKm: 100,
} as const;

// Gig categories with display info
export const GigCategories = [
  { value: "registration_desk", label: "Registration Desk", icon: "clipboard-check" },
  { value: "ushering", label: "Ushering", icon: "users" },
  { value: "booth_staff", label: "Booth Staff", icon: "store" },
  { value: "brand_ambassador", label: "Brand Ambassador", icon: "star" },
  { value: "sampling", label: "Sampling", icon: "gift" },
  { value: "lead_generation", label: "Lead Generation", icon: "user-plus" },
  { value: "hospitality", label: "Hospitality", icon: "coffee" },
  { value: "tech_support", label: "Tech Support", icon: "cpu" },
  { value: "photography", label: "Photography", icon: "camera" },
  { value: "social_media", label: "Social Media", icon: "share-2" },
  { value: "anchoring", label: "Anchoring", icon: "mic" },
  { value: "promotional", label: "Promotional", icon: "megaphone" },
  { value: "general_support", label: "General Support", icon: "help-circle" },
  { value: "other", label: "Other", icon: "more-horizontal" },
] as const;

// Languages
export const Languages = [
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
  { value: "kannada", label: "Kannada" },
  { value: "tamil", label: "Tamil" },
  { value: "telugu", label: "Telugu" },
  { value: "malayalam", label: "Malayalam" },
  { value: "marathi", label: "Marathi" },
  { value: "bengali", label: "Bengali" },
  { value: "gujarati", label: "Gujarati" },
] as const;

// Skills
export const Skills = [
  { value: "public_speaking", label: "Public Speaking" },
  { value: "sales", label: "Sales" },
  { value: "customer_service", label: "Customer Service" },
  { value: "tech_savvy", label: "Tech Savvy" },
  { value: "photography", label: "Photography" },
  { value: "videography", label: "Videography" },
  { value: "social_media", label: "Social Media" },
  { value: "event_management", label: "Event Management" },
  { value: "hospitality", label: "Hospitality" },
  { value: "communication", label: "Communication" },
] as const;
