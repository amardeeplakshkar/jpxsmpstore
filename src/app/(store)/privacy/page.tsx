import { redirect } from "next/navigation";
import { RichText } from "components/store/rich-text";
import { EmptyState } from "components/ui/empty-state";
import { getSetting } from "lib/settings";

export const metadata = { title: "Privacy policy" };

export default async function Page() {
  const legal = await getSetting("legal");
  if (legal.privacyUrl) redirect(legal.privacyUrl);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-3xl font-black">Privacy policy</h1>
      {legal.privacyContent ? <RichText text={legal.privacyContent} /> : <EmptyState title="Not published yet" description="This page has not been written yet. Please check back later." />}
    </div>
  );
}
