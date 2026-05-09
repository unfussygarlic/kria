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
  { label: "Critical",   range: [300, 449] as [number, number], color: "#ff7351" },
  { label: "Developing", range: [450, 599] as [number, number], color: "#f09028" },
  { label: "Active",     range: [600, 699] as [number, number], color: "#8097ff" },
  { label: "Trusted",    range: [700, 799] as [number, number], color: LIME      },
  { label: "Elite",      range: [800, 850] as [number, number], color: "#ffffff" },
];
