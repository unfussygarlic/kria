export const LIME     = "#D4FF00";
export const BG       = "#0B0F0A";
export const SURFACE  = "#111510";
export const SURFACE2 = "#161b14";

export type Role = "runner" | "host";

/** Non-translatable gig card data */
export interface GigCardData {
  pay:           string;
  categoryColor: string;
  spots:         number;
}

export const GIG_CARDS: GigCardData[] = [
  { pay: "₹850 / hr", categoryColor: LIME,      spots: 3 },
  { pay: "₹650 / hr", categoryColor: "#8097ff", spots: 5 },
  { pay: "₹600 / hr", categoryColor: "#f09028", spots: 2 },
];

export const BANDS = [
  { label: "Newcomer", range: [0,   99]   as [number, number], color: "#777575" },
  { label: "Building", range: [100, 299]  as [number, number], color: "#ff7351" },
  { label: "Reliable", range: [300, 499]  as [number, number], color: "#8097ff" },
  { label: "Trusted",  range: [500, 699]  as [number, number], color: "#FFC83D" },
  { label: "Elite",    range: [700, 899]  as [number, number], color: LIME      },
  { label: "Legend",   range: [900, 1000] as [number, number], color: "#ffffff" },
];
