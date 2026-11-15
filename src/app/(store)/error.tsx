"use client";

import { useEffect } from "react";
import { Button } from "components/ui/button";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[StoreError]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-muted">Please try again. If the problem continues, contact us on Discord.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted/60">Digest: {error.digest}</p>}
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
