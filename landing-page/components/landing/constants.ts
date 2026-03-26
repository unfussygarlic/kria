export const LIME = "#D4FF00";
export const BG = "#0B0F0A";
export const SURFACE = "#111510";
export const SURFACE2 = "#161b14";

export type Role = "seeker" | "finder";

export interface GigCard {
  title: string;
  company: string;
  pay: string;
  date: string;
  location: string;
  category: string;
  categoryColor: string;
  spots: number;
}

export const GIG_CARDS: GigCard[] = [
  {
    title: "Event Bartender",
    company: "The Grand Venue",
    pay: "₹850 / hr",
    date: "Sat Apr 12 · 6pm – 2am",
    location: "Bandra, Mumbai",
    category: "Hospitality",
    categoryColor: LIME,
    spots: 3,
  },
  {
    title: "Brand Ambassador",
    company: "Celsius Energy",
    pay: "₹650 / hr",
    date: "Sun Apr 13 · 10am – 4pm",
    location: "Koramangala, Bengaluru",
    category: "Marketing",
    categoryColor: "#8097ff",
    spots: 5,
  },
  {
    title: "Warehouse Lead",
    company: "FlexLogix",
    pay: "₹600 / hr",
    date: "Mon Apr 14 · 7am – 3pm",
    location: "Gurugram, Delhi NCR",
    category: "Logistics",
    categoryColor: "#f09028",
    spots: 2,
  },
];

export const BANDS = [
  { label: "Critical",   range: [300, 449] as [number,number], color: "#ff7351" },
  { label: "Developing", range: [450, 599] as [number,number], color: "#f09028" },
  { label: "Active",     range: [600, 699] as [number,number], color: "#8097ff" },
  { label: "Trusted",    range: [700, 799] as [number,number], color: LIME },
  { label: "Elite",      range: [800, 850] as [number,number], color: "#ffffff" },
];
