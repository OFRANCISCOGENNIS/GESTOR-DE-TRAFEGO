// Tipos compartilhados do domínio TrafegoAI.
// O mesmo formato é usado pelo modo demo (mock) e pelo backend real.

export type Platform = "google" | "meta" | "tiktok";
export type CampaignStatus = "active" | "paused" | "learning";

export interface Kpi {
  spend: number;
  revenue: number;
  roas: number;
  roi: number;
  cpa: number;
  cpc: number;
  cpm: number;
  ctr: number;
  convRate: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface KpiWithDelta {
  value: number;
  delta: number; // variação percentual vs período anterior
}

export interface DashboardSummary {
  current: Kpi;
  deltas: Record<keyof Kpi, number>;
}

export interface TimePoint {
  date: string;
  spend: number;
  revenue: number;
}

export interface FunnelStep {
  step: string;
  value: number;
}

export interface PlatformSplit {
  platform: Platform;
  spend: number;
  revenue: number;
}

export interface HeatCell {
  day: number; // 0=Dom ... 6=Sáb
  hour: number; // 0..23
  value: number; // conversões/índice
}

export interface Highlight {
  kind: "best" | "worst" | "waste" | "opportunity";
  title: string;
  description: string;
  campaignId?: string;
}

export interface Campaign {
  id: string;
  name: string;
  platform: Platform;
  clientId: string;
  status: CampaignStatus;
  budgetDaily: number;
  kpi: Kpi;
}

export interface AdSet {
  id: string;
  campaignId: string;
  name: string;
  status: CampaignStatus;
  kpi: Kpi;
  targeting: Targeting;
}

export interface Targeting {
  ageMin: number;
  ageMax: number;
  gender: "all" | "male" | "female";
  locations: string[];
  interests: string[];
}

export interface Ad {
  id: string;
  adSetId: string;
  name: string;
  status: CampaignStatus;
  kpi: Kpi;
  frequency: number;
  fatigueScore: number; // 0..100, maior = mais fadiga
  thumbnail: string;
}

export interface Recommendation {
  id: string;
  title: string;
  why: string;
  action: string;
  impact: "alto" | "médio" | "baixo";
  estimatedGain: string;
  platform: Platform;
  status: "open" | "applied" | "dismissed";
}

export interface Anomaly {
  id: string;
  metric: string;
  severity: "alta" | "média" | "baixa";
  message: string;
  zscore: number;
  at: string;
}

export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  condition: string;
  action: string;
  budgetFloor: number;
  budgetCap: number;
  maxChangePct: number;
  lastRun?: string;
  fires: number;
}

export interface Goal {
  id: string;
  clientId: string;
  label: string;
  metric: "roas" | "cpa" | "budget";
  target: number;
  current: number;
  projectedEndOfMonth: number;
}

export interface Creative {
  id: string;
  headline: string;
  primaryText: string;
  platform: Platform;
  performanceScore: number;
  ctr: number;
  fatigueScore: number;
}

export interface Client {
  id: string;
  name: string;
  logoColor: string;
}

export interface Connection {
  id: string;
  platform: Platform;
  accountName: string;
  status: "active" | "expired" | "error";
  lastSync: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  country: string;
  marketplace: "TikTok Shop" | "Shopee" | "Mercado Livre" | "Amazon";
  demandScore: number;
  growth7d: number;
  priceMin: number;
  priceMax: number;
  competition: "baixa" | "média" | "alta";
  trend: number[];
  insight: string;
}

export interface TrendingVideo {
  id: string;
  title: string;
  network: "TikTok" | "Reels" | "Shorts" | "YouTube";
  country: string;
  views: number;
  growth24h: number;
  format: string;
  hook: string;
  whyItWorks: string;
  real?: boolean;
}

export interface PostingWindow {
  network: string;
  bestHours: string[];
  note: string;
}

export interface VideoAnalysis {
  verdict: string;
  score: number;
  hooks: string[];
  plans: {
    network: string;
    title: string;
    hashtags: string[];
    bestTime: string;
    format: string;
    paidTip: string;
  }[];
}

export interface Notification {
  id: string;
  kind: "anomaly" | "rule" | "info";
  message: string;
  at: string;
  read: boolean;
}

export interface AuditEntry {
  id: string;
  action: string;
  target: string;
  user: string;
  at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Report {
  id: string;
  clientId: string;
  name: string;
  shareToken: string;
  createdAt: string;
}

export type PlanId = "starter" | "pro" | "agency";
export interface Plan {
  id: PlanId;
  name: string;
  monthly: number;
  features: string[];
}
