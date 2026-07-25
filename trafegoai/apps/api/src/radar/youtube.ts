// Integração REAL com a YouTube Data API v3 (vídeos "Em alta").
// Ativa quando há YOUTUBE_API_KEY. Cache em memória de 30 min p/ respeitar quota.
import type { TrendingVideoDTO } from "./types";

let cache: { at: number; data: TrendingVideoDTO[] } | null = null;
const TTL = 30 * 60 * 1000;

export async function fetchYouTubeTrending(regionCode = "BR"): Promise<TrendingVideoDTO[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];
  if (cache && Date.now() - cache.at < TTL) return cache.data;

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,statistics");
    url.searchParams.set("chart", "mostPopular");
    url.searchParams.set("regionCode", regionCode);
    url.searchParams.set("maxResults", "12");
    url.searchParams.set("key", key);

    const res = await fetch(url.toString());
    if (!res.ok) return cache?.data ?? [];
    const json: any = await res.json();
    const data: TrendingVideoDTO[] = (json.items || []).map((it: any) => ({
      id: it.id,
      title: it.snippet.title,
      network: "YouTube" as const,
      country: regionCode,
      views: Number(it.statistics?.viewCount || 0),
      growth24h: 0,
      format: "YouTube em alta",
      hook: it.snippet.description?.slice(0, 120) || "",
      whyItWorks: "Está entre os mais populares do país agora — bom sinal de demanda.",
      real: true,
    }));
    cache = { at: Date.now(), data };
    return data;
  } catch {
    return cache?.data ?? [];
  }
}
