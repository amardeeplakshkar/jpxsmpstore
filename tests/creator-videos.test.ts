import { test } from "node:test";
import assert from "node:assert/strict";
import { parseKickClips, parseKickLive, parseKickVideos, parseYouTubeLive, parseYouTubeRss } from "lib/creator-videos";

const RSS = `<?xml version="1.0"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
<entry><id>yt:video:yKlFfeWQKgE</id><yt:videoId>yKlFfeWQKgE</yt:videoId><title>Why JpxSmp is Best &amp; more</title>
<published>2026-11-21T06:40:25+00:00</published><media:group><media:thumbnail url="https://i2.ytimg.com/vi/yKlFfeWQKgE/hqdefault.jpg" width="480" height="360"/>
<media:community><media:statistics views="2013"/></media:community></media:group></entry>
<entry><yt:videoId>bad id!</yt:videoId><title>skip</title></entry>
</feed>`;

test("parseYouTubeRss reads uploads from the channel feed", () => {
  const v = parseYouTubeRss(RSS);
  assert.equal(v.length, 1);
  assert.equal(v[0].id, "yKlFfeWQKgE");
  assert.equal(v[0].title, "Why JpxSmp is Best & more");
  assert.equal(v[0].url, "https://www.youtube.com/watch?v=yKlFfeWQKgE");
  assert.equal(v[0].viewCount, 2013);
  assert.equal(v[0].publishedAt, "2026-11-21T06:40:25+00:00");
  assert.equal(parseYouTubeRss("not xml").length, 0);
});

test("parseYouTubeLive only reports a live broadcast", () => {
  const live = `<link rel="canonical" href="https://www.youtube.com/watch?v=abcDEF12345"><meta name="title" content="Hardcore stream"> "isLiveNow":true`;
  assert.deepEqual(parseYouTubeLive(live, "UCx"), { platform: "youtube", url: "https://www.youtube.com/watch?v=abcDEF12345", title: "Hardcore stream" });
  assert.equal(parseYouTubeLive(`"isLiveNow":false`, "UCx"), null);
});

test("parseKickVideos maps past streams and skips live/private ones", () => {
  const v = parseKickVideos(
    [
      { id: 1, session_title: "Hardcore Minecraft Stream", is_live: false, start_time: "2026-11-18 12:53:07", duration: 9397000, thumbnail: { src: "https://images.kick.com/t/720.webp" }, video: { uuid: "50b1191f-314f-4e93-a185-2aacc0d1d40b", views: 92, status: "public", is_private: false }, categories: [{ name: "Minecraft" }] },
      { id: 2, session_title: "Live now", is_live: true, video: { uuid: "x" } },
      { id: 3, session_title: "Private", video: { uuid: "y", is_private: true } },
    ],
    "mrjpx",
  );
  assert.equal(v.length, 1);
  assert.equal(v[0].url, "https://kick.com/mrjpx/videos/50b1191f-314f-4e93-a185-2aacc0d1d40b");
  assert.equal(v[0].publishedAt, "2026-11-18T12:53:07.000Z");
  assert.equal(v[0].duration, 9397);
  assert.equal(v[0].viewCount, 92);
  assert.equal(v[0].category, "Minecraft");
  assert.deepEqual(parseKickVideos({ error: 1 }, "mrjpx"), []);
});

test("parseKickClips maps public clips", () => {
  const c = parseKickClips({ clips: [{ id: "clip_01M7JC69", title: "best owner ", thumbnail_url: "https://clips.kick.com/t.webp", created_at: "2026-11-16T14:30:05.919928Z", duration: 32, view_count: 1, privacy: "public", category: { name: "Minecraft" } }, { id: "clip_2", privacy: "private" }] }, "mrjpx");
  assert.equal(c.length, 1);
  assert.equal(c[0].title, "best owner");
  assert.equal(c[0].url, "https://kick.com/mrjpx/clips/clip_01M7JC69");
  assert.equal(c[0].kind, "clip");
});

test("parseKickLive", () => {
  assert.equal(parseKickLive({ livestream: null }, "mrjpx"), null);
  assert.deepEqual(parseKickLive({ livestream: { is_live: true, session_title: "Live!" } }, "mrjpx"), { platform: "kick", url: "https://kick.com/mrjpx", title: "Live!" });
});
