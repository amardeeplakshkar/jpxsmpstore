/**
 * Latest YouTube uploads + Kick streams/clips for the home page "Latest Videos" section.
 *
 * Fetched directly from YouTube and Kick on the server (no third-party service in between):
 *   - YouTube: the channel's public RSS feed (+ the /live page to detect a live stream)
 *   - Kick:    the public channel, videos and clips endpoints
 * Each source is cached by Next.js for a few minutes and fails independently, so one platform
 * being slow or down never hides the other, and never breaks the page.
 */

const REVALIDATE_SECONDS = 300;
const TIMEOUT_MS = 5000;
const PER_SOURCE_LIMIT = 15;
// Defaults are the JpxSMP channels; override per deployment with env vars.
const DEFAULT_YOUTUBE_CHANNEL_ID = "UC_WURh8J7XLffC8e-Dwq5ww";
const DEFAULT_KICK_CHANNEL = "mrjpx";
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

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

export type CreatorLive = { platform: "youtube" | "kick"; url: string; title: string | null };

export type CreatorFeed = {
  timeline: CreatorVideo[];
  youtube: CreatorVideo[];
  kickStreams: CreatorVideo[];
  kickClips: CreatorVideo[];
  youtubeChannelUrl: string | null;
  kickChannelUrl: string | null;
  live: CreatorLive[];
};

/* ----------------------------------------------------------------- helpers */

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const httpsUrl = (v: unknown) => {
  const s = str(v);
  return s && /^https:\/\//i.test(s) ? s : null;
};
const clip200 = (s: string) => s.slice(0, 200);
const time = (v: CreatorVideo) => (v.publishedAt ? new Date(v.publishedAt).getTime() || 0 : 0);

function decodeXml(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Kick returns "2026-11-18 12:53:10" (UTC, no zone) in some places and ISO strings in others. */
function kickDate(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s) ? `${s.replace(" ", "T")}Z` : s;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/* ----------------------------------------------------------------- parsers (pure, unit-tested) */

export function parseYouTubeRss(xml: string): CreatorVideo[] {
  const out: CreatorVideo[] = [];
  for (const [, entry] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const id = entry.match(/<yt:videoId>([\w-]{6,20})<\/yt:videoId>/)?.[1];
    if (!id) continue;
    const title = decodeXml(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").trim() || "Untitled";
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? null;
    const thumb = entry.match(/<media:thumbnail[^>]*url="([^"]+)"/)?.[1];
    const views = entry.match(/<media:statistics[^>]*views="(\d+)"/)?.[1];
    out.push({
      id,
      title: clip200(title),
      thumbnail: httpsUrl(thumb ? decodeXml(thumb) : null) ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      publishedAt: published,
      url: `https://www.youtube.com/watch?v=${id}`,
      platform: "youtube",
      kind: "upload",
      duration: null,
      viewCount: num(views),
      category: null,
    });
  }
  return out;
}

/** Live if YouTube's /live page for the channel is currently a live broadcast. */
export function parseYouTubeLive(html: string, channelId: string): CreatorLive | null {
  if (!/"isLiveNow":\s*true/.test(html)) return null;
  const videoId = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{6,20})"/)?.[1];
  const title = html.match(/<meta name="title" content="([^"]*)"/)?.[1];
  return {
    platform: "youtube",
    url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : `https://www.youtube.com/channel/${channelId}/live`,
    title: title ? clip200(decodeXml(title)) : null,
  };
}

export function parseKickVideos(data: unknown, channel: string): CreatorVideo[] {
  if (!Array.isArray(data)) return [];
  const out: CreatorVideo[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== "object") continue;
    const v = raw as Record<string, any>;
    if (v.is_live === true) continue; // the live stream itself is shown as the "Live now" pill
    const video = v.video && typeof v.video === "object" ? v.video : {};
    if (video.is_private === true || (video.status && video.status !== "public")) continue;
    const uuid = str(video.uuid);
    const id = uuid ?? str(String(v.id ?? ""));
    if (!id) continue;
    const ms = num(v.duration);
    out.push({
      id,
      title: clip200(str(v.session_title) ?? "Kick stream"),
      thumbnail: httpsUrl(v.thumbnail?.src) ?? httpsUrl(v.thumbnail),
      publishedAt: kickDate(v.start_time) ?? kickDate(v.created_at),
      url: uuid ? `https://kick.com/${channel}/videos/${uuid}` : `https://kick.com/${channel}/videos`,
      platform: "kick",
      kind: "vod",
      duration: ms !== null ? Math.round(ms / 1000) : null,
      viewCount: num(video.views) ?? num(v.views),
      category: str(v.categories?.[0]?.name),
    });
  }
  return out;
}

export function parseKickClips(data: unknown, channel: string): CreatorVideo[] {
  const list = data && typeof data === "object" && Array.isArray((data as any).clips) ? ((data as any).clips as unknown[]) : [];
  const out: CreatorVideo[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const c = raw as Record<string, any>;
    const id = str(c.id);
    if (!id || !/^[\w-]+$/.test(id) || (c.privacy && c.privacy !== "public")) continue;
    out.push({
      id,
      title: clip200(str(c.title) ?? "Clip"),
      thumbnail: httpsUrl(c.thumbnail_url),
      publishedAt: kickDate(c.created_at),
      url: `https://kick.com/${channel}/clips/${id}`,
      platform: "kick",
      kind: "clip",
      duration: num(c.duration),
      viewCount: num(c.view_count) ?? num(c.views),
      category: str(c.category?.name),
    });
  }
  return out;
}

export function parseKickLive(data: unknown, channel: string): CreatorLive | null {
  const ls = data && typeof data === "object" ? (data as Record<string, any>).livestream : null;
  if (!ls || typeof ls !== "object" || ls.is_live === false) return null;
  return { platform: "kick", url: `https://kick.com/${channel}`, title: str(ls.session_title) ? clip200(ls.session_title) : null };
}

/* ----------------------------------------------------------------- fetching */

async function get(url: string, accept: string): Promise<Response> {
  const res = await fetch(url, {
    next: { revalidate: REVALIDATE_SECONDS, tags: ["creator-videos"] },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept, "user-agent": BROWSER_UA, "accept-language": "en-US,en;q=0.9" },
  });
  if (!res.ok) throw new Error(`${new URL(url).hostname} ${res.status}`);
  return res;
}

function settled<T>(r: PromiseSettledResult<T>, label: string): T | null {
  if (r.status === "fulfilled") return r.value;
  console.warn(`[creator-videos] ${label} unavailable:`, (r.reason as Error)?.message ?? r.reason);
  return null;
}

/** Returns null when nothing could be loaded, so the section simply doesn't render. */
export async function getCreatorFeed(): Promise<CreatorFeed | null> {
  const envYt = process.env.YOUTUBE_CHANNEL_ID?.trim();
  const envKick = process.env.KICK_CHANNEL?.trim().toLowerCase();
  const ytId = envYt && /^UC[\w-]{20,24}$/.test(envYt) ? envYt : DEFAULT_YOUTUBE_CHANNEL_ID;
  const kick = envKick && /^[a-z0-9_-]{2,40}$/.test(envKick) ? envKick : DEFAULT_KICK_CHANNEL;

  const [ytRss, ytLive, kickChannel, kickVideos, kickClips] = await Promise.allSettled([
    get(`https://www.youtube.com/feeds/videos.xml?channel_id=${ytId}`, "application/atom+xml,text/xml").then((r) => r.text()),
    get(`https://www.youtube.com/channel/${ytId}/live`, "text/html").then((r) => r.text()),
    get(`https://kick.com/api/v2/channels/${kick}`, "application/json").then((r) => r.json()),
    get(`https://kick.com/api/v2/channels/${kick}/videos`, "application/json").then((r) => r.json()),
    get(`https://kick.com/api/v2/channels/${kick}/clips?sort=date&time=all`, "application/json").then((r) => r.json()),
  ]);

  const youtube = parseYouTubeRss(settled(ytRss, "YouTube feed") ?? "").slice(0, PER_SOURCE_LIMIT);
  const kickStreams = parseKickVideos(settled(kickVideos, "Kick videos"), kick).slice(0, PER_SOURCE_LIMIT);
  const kickClipList = parseKickClips(settled(kickClips, "Kick clips"), kick).slice(0, PER_SOURCE_LIMIT);
  const ytLiveHtml = settled(ytLive, "YouTube live");
  const kickChannelData = settled(kickChannel, "Kick channel");
  const live = [ytLiveHtml ? parseYouTubeLive(ytLiveHtml, ytId) : null, parseKickLive(kickChannelData, kick)].filter((l): l is CreatorLive => l !== null);

  const timeline = [...youtube, ...kickStreams, ...kickClipList].sort((a, b) => time(b) - time(a));
  if (timeline.length === 0 && live.length === 0) return null;

  return {
    timeline,
    youtube,
    kickStreams,
    kickClips: kickClipList,
    youtubeChannelUrl: `https://www.youtube.com/channel/${ytId}`,
    kickChannelUrl: `https://kick.com/${kick}`,
    live,
  };
}
