import { CreatorVideos } from "components/store/creator-videos";
import { SectionHeading } from "components/store/section-heading";
import { getCreatorFeed } from "lib/creator-videos";

/** Home page "Latest Videos" section. Renders nothing if the feed is unavailable. */
export async function LatestVideos() {
  const feed = await getCreatorFeed();
  if (!feed) return null;
  return (
    <section className="mb-20" aria-label="Latest videos">
      <SectionHeading title="Latest Videos" subtitle="Fresh uploads, streams and clips from JpxSMP." />
      <CreatorVideos feed={feed} />
    </section>
  );
}

export function LatestVideosSkeleton() {
  return (
    <section className="mb-20 animate-pulse" aria-hidden>
      <div className="mb-8 h-9 w-56 rounded-xl bg-white/5" />
      <div className="aspect-video w-full rounded-3xl bg-white/5" />
    </section>
  );
}
