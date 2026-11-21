/**
 * Latest YouTube uploads + Kick streams/clips for the home page "Latest Videos" section.
 * Data comes from the creator-showcase API (Val Town) and is fetched on the server, cached by Next.js
 * for a few minutes, so visitors never call it directly and a slow/broken API never breaks the page.
 */
const DEFAULT_SHOWCASE_URL = "https://deep--01a1e081d85274f8bda7836af181a740.web.val.run/api/showcase";
const REVALIDATE_SECONDS = 300;
const TIMEOUT_MS = 4000;

export type CreatorVideo = {
  id: string;
  title: string;
  thumbnail: string | null;
  publishedAt: string | null;
  url: string;
  platform: "youtube" | "kick";
  kind: "upload" | "vod" | "clip";
  duration: number | null;
  viewCount: number | null;
  category: string | null;
};

export type CreatorFeed = {
  timeline: CreatorVideo[];
  youtube: CreatorVideo[];
  kickStreams: CreatorVideo[];
  kickClips: CreatorVideo[];
  youtubeChannelUrl: string | null;
  kickChannelUrl: string | null;
  live: { platform: "youtube" | "kick"; url: string; title: string | null }[];
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const httpUrl = (v: unknown) => {
  const s = str(v);
  return s && /^https:\/\//i.test(s) ? s : null;
};

function toVideo(raw: unknown): CreatorVideo | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id);
  const url = httpUrl(r.url);
  const platform = r.platform === "kick" ? "kick" : r.platform === "youtube" ? "youtube" : null;
  if (!id || !url || !platform) return null;
  // Only YouTube IDs are ever placed in an embed URL, so keep them strictly to YouTube's charset.
  if (platform === "youtube" && !/^[\w-]{6,20}$/.test(id)) return null;
  const kind = r.kind === "vod" || r.kind === "clip" ? r.kind : "upload";
  return {
    id,
    title: (str(r.title) ?? "Untitled").slice(0, 200),
    thumbnail: httpUrl(r.thumbnail),
    publishedAt: str(r.publishedAt),
    url,
    platform,
    kind,
    duration: num(r.duration),
    viewCount: num(r.viewCount),
    category: str(r.category),
  };
}

const list = (v: unknown) => (Array.isArray(v) ? v.map(toVideo).filter((x): x is CreatorVideo => x !== null) : []);
const time = (v: CreatorVideo) => (v.publishedAt ? new Date(v.publishedAt).getTime() || 0 : 0);

/** Returns null when the feed is unavailable or empty, so the section simply doesn't render. */
export async function getCreatorFeed(): Promise<CreatorFeed | null> {
  const endpoint = process.env.CREATOR_SHOWCASE_URL || DEFAULT_SHOWCASE_URL;
  try {
    const res = await fetch(endpoint, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ["creator-videos"] },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, any>;
    const youtube = list(data?.youtube?.videos);
    const kickStreams = list(data?.kick?.videos);
    const kickClips = list(data?.kick?.clips);
    const timeline = (Array.isArray(data?.timeline) ? list(data.timeline) : [...youtube, ...kickStreams, ...kickClips]).sort((a, b) => time(b) - time(a));
    if (timeline.length === 0) return null;
    const live = [data?.youtube?.live, data?.kick?.live]
      .filter((l) => l && l.isLive === true && httpUrl(l.url))
      .map((l) => ({ platform: l.platform === "kick" ? ("kick" as const) : ("youtube" as const), url: httpUrl(l.url)!, title: str(l.title) }));
    return {
      timeline,
      youtube,
      kickStreams,
      kickClips,
      youtubeChannelUrl: httpUrl(data?.youtube?.channel?.url),
      kickChannelUrl: httpUrl(data?.kick?.live?.url),
      live,
    };
  } catch (err) {
    console.warn("[creator-videos] feed unavailable:", (err as Error).message);
    return null;
  }
}
