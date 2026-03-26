/**
 * L — Centralized UI label constants.
 * All user-facing terminology lives here.
 * Change a label once → updates everywhere it's imported.
 */
export const L = {
  // ── Roles ─────────────────────────────────────────────────────────────────
  SEEKER: "Seeker",
  FINDER: "Finder",

  SEEKER_TAGLINE: "Find & apply to gigs",
  FINDER_TAGLINE: "Post gigs & hire talent",

  // ── App identity ──────────────────────────────────────────────────────────
  APP_NAME: "Kria",
  TAGLINE: "Your gig marketplace",

  // ── Tabs ──────────────────────────────────────────────────────────────────
  TAB_HOME: "Home",
  TAB_EXPLORE: "Explore",
  TAB_SPACE: "My Space",
  TAB_ARENA: "Arena",

  // ── Actions ───────────────────────────────────────────────────────────────
  ACTION_EXPLORE_GIGS: "Explore Gigs",
  ACTION_FIND_NEXT_GIG: "Find your next gig",
  ACTION_POST_GIG: "Post a Gig",
  ACTION_HIRE_TODAY: "Hire someone today",
  ACTION_CREATE_EVENT: "Create an Event",
  ACTION_HOST_EVENT: "Host an Event",
  ACTION_HOST_EVENT_SUB: "Create an event and post multiple gigs at once",
  ACTION_MY_SPACE: "My Space",
  ACTION_MY_SPACE_SUB: "Your posts & gigs",
  ACTION_ARENA: "Arena",
  ACTION_ARENA_SUB: "Your FICO scores",

  // ── Role selection screen ─────────────────────────────────────────────────
  ROLE_SELECT_TITLE: "How would you like to enter?",
  ROLE_SELECT_SUB: "You can switch roles by logging out.",

  // ── Units ─────────────────────────────────────────────────────────────────
  UNIT_GIG: "Gig",
  UNIT_GIGS: "Gigs",
  UNIT_EVENT: "Event",
  UNIT_EVENTS: "Events",

  // ── Momentum ──────────────────────────────────────────────────────────────
  MOMENTUM: "Momentum",
  YOUR_MOMENTUM: "Your Momentum",
  VIEW_DETAILS: "View details →",
  GIGS_DONE: "Gigs Done",
  GIGS_POSTED: "Gigs Posted",
  SCORE_BAND: "Score Band",

  // ── Greetings ─────────────────────────────────────────────────────────────
  GREETING_MORNING: "Good morning",
  GREETING_AFTERNOON: "Good afternoon",
  GREETING_EVENING: "Good evening",
  GREETING_SUB_SEEKER: "Find your next opportunity.",
  GREETING_SUB_FINDER: "Manage your gigs and events.",

  // ── Explore ───────────────────────────────────────────────────────────────
  EXPLORE_TAB_FLAMES: "🔥 Flames",
  EXPLORE_TAB_SEARCH: "🔍 Search",
  EXPLORE_EMPTY_TITLE: "You're all caught up!",
  EXPLORE_EMPTY_SUB: "No more gigs nearby right now. Check back soon.",
  EXPLORE_FINDER_APPLY_BLOCKED: "Switch to Seeker mode to apply to gigs.",

  // ── Space ─────────────────────────────────────────────────────────────────
  SPACE_SEEKER_EMPTY_TITLE: "No accepted gigs",
  SPACE_FINDER_EMPTY_TITLE: "Nothing posted yet",
  SPACE_FINDER_EMPTY_SUB: "Tap the + to post a gig or create an event.",
} as const;
