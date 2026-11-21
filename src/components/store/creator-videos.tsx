"use client";

import * as React from "react";
import { Play, Sparkles, Scissors } from "lucide-react";
import type { CreatorFeed, CreatorVideo } from "lib/creator-videos";
import { cn } from "lib/utils";

/** Items per tab: one large hero plus a grid. */
const TAB_LIMIT = 7;
const KICK = "#53fc18";
const YT = "#ff2d2d";

type TabId = "all" | "youtube" | "kick" | "clips";

export function CreatorVideos({ feed }: { feed: CreatorFeed }) {
  const [tab, setTab] = React.useState<TabId>("all");
  const tabs = [
    { id: "all" as const, label: "Latest", items: feed.timeline, icon: <Sparkles className="size-4" /> },
    { id: "youtube" as const, label: "YouTube", items: feed.youtube, icon: <YouTubeGlyph /> },
    { id: "kick" as const, label: "Kick streams", items: feed.kickStreams, icon: <KickGlyph /> },
    { id: "clips" as const, label: "Kick clips", items: feed.kickClips, icon: <Scissors className="size-4" /> },
  ].filter((t) => t.id === "all" || t.items.length > 0);
  const active = tabs.find((t) => t.id === tab) ?? tabs[0];
  const items = active.items.slice(0, TAB_LIMIT);

  return (
    <div>
      {feed.live.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-3">
          {feed.live.map((l) => (
            <a key={l.platform} href={l.url} target="_blank" rel="noopener noreferrer" className="panel inline-flex items-center gap-2.5 px-4 py-2.5 text-sm font-black text-white hover:brightness-125">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full opacity-75" style={{ background: l.platform === "kick" ? KICK : YT }} />
                <span className="relative inline-flex size-2.5 rounded-full" style={{ background: l.platform === "kick" ? KICK : YT }} />
              </span>
              Live now on {l.platform === "kick" ? "Kick" : "YouTube"}
              {l.title && <span className="max-w-[260px] truncate font-semibold text-muted">· {l.title}</span>}
            </a>
          ))}
        </div>
      )}

      {tabs.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Video source">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active.id === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-xs font-black uppercase tracking-wide transition",
                active.id === t.id ? "border-primary/60 bg-primary/15 text-white" : "border-white/10 bg-white/[0.03] text-muted hover:text-white",
              )}
            >
              {t.icon}
              {t.label}
              <span className="tabular-nums opacity-60">{Math.min(t.items.length, TAB_LIMIT)}</span>
            </button>
          ))}
        </div>
      )}

      <VideoGrid key={active.id} videos={items} />

      {(feed.youtubeChannelUrl || feed.kickChannelUrl) && (
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {feed.youtubeChannelUrl && (
            <a href={feed.youtubeChannelUrl} target="_blank" rel="noopener noreferrer" className="btn3d btn3d-dark h-12 px-6 text-sm">
              <YouTubeGlyph /> YouTube channel
            </a>
          )}
          {feed.kickChannelUrl && (
            <a href={feed.kickChannelUrl} target="_blank" rel="noopener noreferrer" className="btn3d btn3d-dark h-12 px-6 text-sm">
              <KickGlyph /> Kick channel
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function VideoGrid({ videos }: { videos: CreatorVideo[] }) {
  const [playing, setPlaying] = React.useState<string | null>(null);
  if (videos.length === 0) return <p className="panel px-6 py-12 text-center font-semibold text-muted">No videos yet.</p>;
  const [hero, ...rest] = videos;
  return (
    <div className="space-y-6">
      <VideoTile video={hero} hero playing={playing === key(hero)} onPlay={() => setPlaying(key(hero))} />
      {rest.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((v) => (
            <VideoTile key={key(v)} video={v} playing={playing === key(v)} onPlay={() => setPlaying(key(v))} />
          ))}
        </div>
      )}
    </div>
  );
}

const key = (v: CreatorVideo) => `${v.platform}-${v.id}`;

function VideoTile({ video, hero = false, playing, onPlay }: { video: CreatorVideo; hero?: boolean; playing: boolean; onPlay: () => void }) {
  // YouTube plays inline; Kick VODs/clips open on Kick.
  const inline = video.platform === "youtube";
  const poster = (
    <>
      {video.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={video.thumbnail} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-black" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      <span className={cn("absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-white/15 backdrop-blur-sm transition group-hover:scale-110", hero ? "size-16" : "size-12")}>
        <Play className={cn("fill-white text-white", hero ? "size-6" : "size-5")} />
      </span>
      <span className="absolute left-3 top-3 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white/85 backdrop-blur-sm">
          {video.platform === "kick" ? <KickGlyph /> : <YouTubeGlyph />}
          {hero && (video.platform === "kick" ? "Kick" : "YouTube")}
        </span>
        {video.kind !== "upload" && (
          <span className="rounded-md bg-black/70 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white/75 backdrop-blur-sm">{video.kind === "clip" ? "Clip" : "Past stream"}</span>
        )}
      </span>
      {video.duration ? <span className="absolute bottom-3 right-3 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white/90">{formatDuration(video.duration)}</span> : null}
      {hero && (
        <div className="absolute bottom-0 left-0 right-0 p-5 text-left sm:p-7">
          <h3 className="line-clamp-2 max-w-3xl text-xl font-black leading-snug text-white sm:text-2xl">{video.title}</h3>
          <Meta video={video} className="mt-1.5" />
        </div>
      )}
    </>
  );
  const frame = cn("group relative block aspect-video w-full overflow-hidden bg-black", hero ? "rounded-3xl" : "");
  const media =
    playing && inline ? (
      <div className={frame}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}?autoplay=1`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    ) : inline ? (
      <button type="button" onClick={onPlay} className={cn(frame, "cursor-pointer")} aria-label={`Play ${video.title}`}>
        {poster}
      </button>
    ) : (
      <a href={video.url} target="_blank" rel="noopener noreferrer" className={frame} aria-label={`Watch ${video.title} on Kick`}>
        {poster}
      </a>
    );

  if (hero) return <div className="overflow-hidden rounded-3xl border border-white/10 shadow-[0_20px_40px_rgb(0_0_0/0.4)]">{media}</div>;
  return (
    <div className="panel lift overflow-hidden p-0">
      {media}
      <div className="p-4">
        <a href={video.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-sm font-black leading-snug text-white hover:text-primary">
          {video.title}
        </a>
        <Meta video={video} className="mt-1" />
      </div>
    </div>
  );
}

function Meta({ video, className }: { video: CreatorVideo; className?: string }) {
  const bits = [video.category, video.viewCount ? `${formatCount(video.viewCount)} views` : null].filter(Boolean);
  return (
    <p className={cn("truncate text-xs font-semibold text-muted", className)}>
      {/* Relative time depends on the viewer's clock, so it may differ from the server render. */}
      <span suppressHydrationWarning>{relativeTime(video.publishedAt)}</span>
      {bits.length > 0 && <span>{relativeTime(video.publishedAt) ? " · " : ""}{bits.join(" · ")}</span>}
    </p>
  );
}

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return s > 0 && m < 10 ? `${m}m ${s}s` : `${m}m`;
  return `${Math.max(1, s)}s`;
}

export function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export function relativeTime(iso: string | null, now = Date.now()) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  let value = Math.max(1, Math.floor((now - then) / 1000));
  const units: [number, string][] = [[60, "second"], [60, "minute"], [24, "hour"], [7, "day"], [4.35, "week"], [12, "month"], [Infinity, "year"]];
  for (const [size, name] of units) {
    if (value < size) {
      const v = Math.floor(value);
      return `${v} ${name}${v === 1 ? "" : "s"} ago`;
    }
    value /= size;
  }
  return "";
}

function KickGlyph() {
  return (
    <svg viewBox="0 0 32 32" className="size-4" fill={KICK} aria-hidden>
      <path d="M3 2h7v9h3V8h3V5h3V2h10v9l-4 4 4 4v9H19v-3h-3v-3h-3v6H3z" />
    </svg>
  );
}

function YouTubeGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill={YT} aria-hidden>
      <path d="M23 12s0-3.7-.5-5.5c-.3-1-1-1.7-2-2C18.7 4 12 4 12 4s-6.7 0-8.5.5c-1 .3-1.7 1-2 2C1 8.3 1 12 1 12s0 3.7.5 5.5c.3 1 1 1.7 2 2C5.3 20 12 20 12 20s6.7 0 8.5-.5c1-.3 1.7-1 2-2C23 15.7 23 12 23 12z" />
      <path d="M10 15.5v-7l6 3.5z" fill="#fff" />
    </svg>
  );
}
