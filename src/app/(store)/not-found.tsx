import Link from "next/link";
import { Button } from "components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl font-black text-gradient">404</p>
      <h1 className="mt-4 text-2xl font-bold">This block doesn&apos;t exist</h1>
      <p className="mt-2 text-muted">The page you were looking for could not be found.</p>
      <Button asChild className="mt-6">
        <Link href="/">Back to store</Link>
      </Button>
    </div>
  );
}
