export interface TrendingVideoDTO {
  id: string;
  title: string;
  network: "TikTok" | "Reels" | "Shorts" | "YouTube";
  country: string;
  views: number;
  growth24h: number;
  format: string;
  hook: string;
  whyItWorks: string;
  real: boolean;
}
