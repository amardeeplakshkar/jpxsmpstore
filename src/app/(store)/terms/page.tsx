import { redirect } from "next/navigation";
import { RichText } from "components/store/rich-text";
import { EmptyState } from "components/ui/empty-state";
import { getSetting } from "lib/settings";

export const metadata = { title: "Terms and conditions", alternates: { canonical: "/terms" } };

export default async function Page() {
  const legal = await getSetting("legal");
  if (legal.termsUrl) redirect(legal.termsUrl);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-3xl font-black">Terms and conditions</h1>
      {legal.termsContent ? <RichText text={legal.termsContent} /> : <EmptyState title="Not published yet" description="This page has not been written yet. Please check back later." />}
    </div>
  );
}
