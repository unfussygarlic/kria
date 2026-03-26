// Kria App Configuration

export const Config = {
  // App info
  appName: "Kria",
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

// Skills — flat list kept for backward compat; use SkillCategories for the UI
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

// Categorised skills used in Edit Profile
export const SkillCategories = [
  {
    category: "Communication",
    skills: [
      { value: "public_speaking", label: "Public Speaking" },
      { value: "communication", label: "Communication" },
      { value: "presentation", label: "Presentation" },
      { value: "negotiation", label: "Negotiation" },
      { value: "customer_service", label: "Customer Service" },
      { value: "multilingual", label: "Multilingual" },
      { value: "content_writing", label: "Content Writing" },
    ],
  },
  {
    category: "Sales & Marketing",
    skills: [
      { value: "sales", label: "Sales" },
      { value: "brand_promotion", label: "Brand Promotion" },
      { value: "lead_generation", label: "Lead Generation" },
      { value: "digital_marketing", label: "Digital Marketing" },
      { value: "social_media", label: "Social Media" },
      { value: "influencer_marketing", label: "Influencer Marketing" },
      { value: "market_research", label: "Market Research" },
      { value: "cold_calling", label: "Cold Calling" },
    ],
  },
  {
    category: "Events",
    skills: [
      { value: "event_management", label: "Event Management" },
      { value: "ushering", label: "Ushering" },
      { value: "registration_desk", label: "Registration Desk" },
      { value: "anchoring", label: "Anchoring / Hosting" },
      { value: "crowd_management", label: "Crowd Management" },
      { value: "stage_management", label: "Stage Management" },
      { value: "ticketing", label: "Ticketing" },
    ],
  },
  {
    category: "Technical",
    skills: [
      { value: "tech_savvy", label: "Tech Savvy" },
      { value: "ms_office", label: "MS Office" },
      { value: "data_entry", label: "Data Entry" },
      { value: "tech_support", label: "Tech Support" },
      { value: "photography", label: "Photography" },
      { value: "videography", label: "Videography" },
      { value: "graphic_design", label: "Graphic Design" },
      { value: "video_editing", label: "Video Editing" },
      { value: "live_streaming", label: "Live Streaming" },
    ],
  },
  {
    category: "Hospitality & F&B",
    skills: [
      { value: "hospitality", label: "Hospitality" },
      { value: "food_service", label: "Food & Beverage Service" },
      { value: "bartending", label: "Bartending" },
      { value: "hotel_management", label: "Hotel Management" },
      { value: "housekeeping", label: "Housekeeping" },
    ],
  },
  {
    category: "Physical & Logistics",
    skills: [
      { value: "driving_2w", label: "Driving (2-Wheeler)" },
      { value: "driving_4w", label: "Driving (4-Wheeler)" },
      { value: "heavy_lifting", label: "Heavy Lifting" },
      { value: "logistics", label: "Logistics & Dispatch" },
      { value: "first_aid", label: "First Aid" },
      { value: "security", label: "Security / Bouncer" },
    ],
  },
  {
    category: "Creative & Performance",
    skills: [
      { value: "acting", label: "Acting" },
      { value: "dancing", label: "Dancing" },
      { value: "singing", label: "Singing" },
      { value: "modelling", label: "Modelling" },
      { value: "emceeing", label: "Emceeing" },
      { value: "stand_up", label: "Stand-Up Comedy" },
      { value: "costume_character", label: "Costume Character" },
    ],
  },
] as const;

export type SkillValue = (typeof SkillCategories)[number]["skills"][number]["value"];

// Degree options for education entries
export const DegreeOptions = [
  { group: "10th / 12th", options: [
    { value: "10th", label: "10th (SSLC / Matriculation)" },
    { value: "12th", label: "12th (HSC / PUC / ISC)" },
  ]},
  { group: "Undergraduate", options: [
    { value: "btech_be", label: "BTech / BE" },
    { value: "bca", label: "BCA" },
    { value: "bsc", label: "BSc" },
    { value: "ba", label: "BA" },
    { value: "bcom", label: "BCom" },
    { value: "bba", label: "BBA" },
    { value: "bpharm", label: "BPharm" },
    { value: "mbbs", label: "MBBS" },
    { value: "barch", label: "BArch" },
    { value: "llb", label: "LLB" },
    { value: "bfa", label: "BFA" },
    { value: "bhm", label: "BHM (Hotel Management)" },
    { value: "bdes", label: "BDes" },
    { value: "bvoc", label: "BVoc" },
  ]},
  { group: "Postgraduate", options: [
    { value: "mtech_me", label: "MTech / ME" },
    { value: "mca", label: "MCA" },
    { value: "msc", label: "MSc" },
    { value: "ma", label: "MA" },
    { value: "mcom", label: "MCom" },
    { value: "mba", label: "MBA" },
    { value: "mpharm", label: "MPharm" },
    { value: "md", label: "MD / MS (Medicine)" },
    { value: "march", label: "MArch" },
    { value: "llm", label: "LLM" },
    { value: "mfa", label: "MFA" },
    { value: "mdes", label: "MDes" },
  ]},
  { group: "Diploma & Certificate", options: [
    { value: "diploma", label: "Diploma (Polytechnic)" },
    { value: "iti", label: "ITI Certificate" },
    { value: "pgdm", label: "PGDM" },
    { value: "pgd", label: "PG Diploma" },
    { value: "certificate", label: "Certificate Course" },
  ]},
  { group: "Doctoral", options: [
    { value: "phd", label: "PhD" },
    { value: "mphil", label: "MPhil" },
  ]},
] as const;
