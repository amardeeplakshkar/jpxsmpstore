"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Gift, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "components/ui/button";
import { Field, Input, Textarea } from "components/ui/input";
import { api } from "lib/client-api";
import { cn, effectivePricePaise, formatINR } from "lib/utils";

type Product = {
  slug: string;
  name: string;
  type: string;
  imageUrl: string | null;
  regularPricePaise: number;
  salePricePaise: number | null;
  javaAvailable: boolean;
  bedrockAvailable: boolean;
};

const JAVA_RE = /^[A-Za-z0-9_]{3,16}$/;
const BEDROCK_RE = /^[.*]?[A-Za-z0-9][A-Za-z0-9 _]{1,15}$/;

function newKey() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function SelectCard({ selected, onClick, icon, title, body }: { selected: boolean; onClick: () => void; icon: React.ReactNode; title: string; body: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "group flex w-full flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all cursor-pointer",
        selected ? "border-primary bg-primary/15 shadow-glow" : "border-border bg-surface hover:border-primary/50 hover:-translate-y-0.5",
      )}
    >
      <span className={cn("grid size-11 place-items-center rounded-lg", selected ? "bg-primary text-white" : "bg-elevated text-violet-300")}>{icon}</span>
      <span>
        <span className="block text-lg font-bold">{title}</span>
        <span className="block text-sm text-muted">{body}</span>
      </span>
    </button>
  );
}

export function CheckoutFlow({ product, buyerName }: { product: Product; buyerName: string }) {
  const router = useRouter();
  const storageKey = `jpx-checkout-${product.slug}`;
  const [purchaseType, setPurchaseType] = React.useState<"SELF" | "GIFT" | null>(null);
  const [edition, setEdition] = React.useState<"JAVA" | "BEDROCK">(product.javaAvailable ? "JAVA" : "BEDROCK");
  const [username, setUsername] = React.useState("");
  const [giftNote, setGiftNote] = React.useState("");
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [idemKey, setIdemKey] = React.useState<string>("");

  // Keep one idempotency key per checkout attempt so double-clicks and retries return the same order.
  React.useEffect(() => {
    const existing = sessionStorage.getItem(storageKey);
    if (existing) setIdemKey(existing);
    else {
      const k = newKey();
      sessionStorage.setItem(storageKey, k);
      setIdemKey(k);
    }
  }, [storageKey]);

  const unit = effectivePricePaise(product);
  const discount = product.regularPricePaise - unit;

  function validateUsername(): boolean {
    const re = edition === "JAVA" ? JAVA_RE : BEDROCK_RE;
    if (!re.test(username.trim())) {
      setError(edition === "JAVA" ? "Java usernames are 3-16 characters: letters, numbers and underscores." : "Enter a valid Bedrock gamertag (3-16 characters).");
      return false;
    }
    setError(null);
    return true;
  }

  async function placeOrder() {
    setSubmitting(true);
    try {
      const res = await api<{ orderNumber: string }>("/api/orders", {
        method: "POST",
        json: {
          productSlug: product.slug,
          purchaseType,
          gameEdition: edition,
          minecraftUsername: username.trim(),
          giftNote: purchaseType === "GIFT" && giftNote.trim() ? giftNote.trim() : null,
          idempotencyKey: idemKey,
        },
      });
      sessionStorage.removeItem(storageKey);
      router.push(`/orders/${res.orderNumber}`);
    } catch (err) {
      toast.error((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <ol className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" aria-label="Checkout progress">
          {["Recipient", "Player details", "Review"].map((label, i) => (
            <li key={label} className={cn("flex items-center gap-2", step >= i + 1 ? "text-secondary" : "text-muted")}>
              <span className={cn("grid size-6 place-items-center rounded-md", step >= i + 1 ? "bg-secondary text-background" : "bg-elevated")}>{i + 1}</span>
              <span className="hidden sm:inline">{label}</span>
              {i < 2 && <span className="mx-1 h-px w-6 bg-border" />}
            </li>
          ))}
        </ol>

        {step === 1 && (
          <section aria-labelledby="who" className="space-y-4">
            <h2 id="who" className="text-xl font-bold">Who is this for?</h2>
            <div role="radiogroup" className="grid gap-4 sm:grid-cols-2">
              <SelectCard selected={purchaseType === "SELF"} onClick={() => setPurchaseType("SELF")} icon={<User />} title="Buy for myself" body={`Deliver to your own Minecraft account, ${buyerName}.`} />
              <SelectCard selected={purchaseType === "GIFT"} onClick={() => setPurchaseType("GIFT")} icon={<Gift />} title="Gift to someone" body="Send it to a friend's Minecraft account." />
            </div>
            <div className="flex justify-end">
              <Button disabled={!purchaseType} onClick={() => setStep(2)}>
                Continue <ArrowRight />
              </Button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="player" className="space-y-5">
            <h2 id="player" className="text-xl font-bold">{purchaseType === "GIFT" ? "Recipient details" : "Your player details"}</h2>
            <div>
              <p className="mb-2 text-sm font-medium">Game edition</p>
              <div role="radiogroup" className="grid grid-cols-2 gap-3">
                {(["JAVA", "BEDROCK"] as const).map((ed) => {
                  const available = ed === "JAVA" ? product.javaAvailable : product.bedrockAvailable;
                  return (
                    <button
                      key={ed}
                      type="button"
                      role="radio"
                      aria-checked={edition === ed}
                      disabled={!available}
                      onClick={() => {
                        setEdition(ed);
                        setError(null);
                      }}
                      className={cn(
                        "rounded-xl border-2 px-4 py-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer",
                        edition === ed ? (ed === "JAVA" ? "border-secondary bg-secondary/10" : "border-primary bg-primary/15") : "border-border bg-surface hover:border-primary/50",
                      )}
                    >
                      <span className="block font-bold">{ed === "JAVA" ? "Java Edition" : "Bedrock Edition"}</span>
                      <span className="block text-xs text-muted">{available ? (ed === "JAVA" ? "PC / Mac / Linux" : "Mobile, console, Windows") : "Not available for this product"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label={purchaseType === "GIFT" ? "Recipient's Minecraft username" : "Your Minecraft username"} htmlFor="mc-username" error={error} hint="Double-check the spelling. Items are delivered to this exact username.">
              <Input id="mc-username" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={17} autoComplete="off" aria-invalid={Boolean(error)} placeholder={edition === "JAVA" ? "Steve_123" : "Alex Gamer"} />
            </Field>
            {purchaseType === "GIFT" && (
              <Field label="Gift message (optional)" htmlFor="gift-note">
                <Textarea id="gift-note" value={giftNote} onChange={(e) => setGiftNote(e.target.value)} maxLength={200} placeholder="Happy birthday!" />
              </Field>
            )}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft /> Back
              </Button>
              <Button onClick={() => validateUsername() && setStep(3)}>
                Review order <ArrowRight />
              </Button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section aria-labelledby="review" className="space-y-5">
            <h2 id="review" className="text-xl font-bold">Review your order</h2>
            <dl className="divide-y divide-border rounded-xl border border-border bg-surface">
              {[
                ["Purchase type", purchaseType === "GIFT" ? "Gift" : "For myself"],
                ["Minecraft username", username.trim()],
                ["Game edition", edition === "JAVA" ? "Java" : "Bedrock"],
                ...(purchaseType === "GIFT" && giftNote.trim() ? [["Gift message", giftNote.trim()]] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="flex items-center gap-2 text-xs text-muted">
              <Lock className="size-3.5" /> The final amount is calculated on our server when your order is created.
            </p>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>
                <ArrowLeft /> Back
              </Button>
              <Button variant="gold" size="lg" loading={submitting} disabled={!idemKey} onClick={placeOrder}>
                Place order and pay {formatINR(unit)}
              </Button>
            </div>
          </section>
        )}
      </div>

      <aside className="h-fit rounded-xl border border-border bg-surface p-5 lg:sticky lg:top-24" aria-label="Order summary">
        <h2 className="mb-4 font-semibold">Order summary</h2>
        <div className="flex gap-3">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-elevated bg-blocks">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt="" className="h-full w-full object-contain p-1" />
            ) : (
              <span className="text-xs text-muted">{product.type}</span>
            )}
          </div>
          <div>
            <p className="font-semibold">{product.name}</p>
            <p className="text-xs text-muted">
              {purchaseType ? (purchaseType === "GIFT" ? "Gift" : "For myself") : "Recipient not chosen"} · {edition === "JAVA" ? "Java" : "Bedrock"}
            </p>
            {username && <p className="text-xs text-muted">Player: {username}</p>}
          </div>
        </div>
        <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Price</dt>
            <dd>{formatINR(product.regularPricePaise)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Discount</dt>
            <dd className={discount > 0 ? "text-success" : ""}>{discount > 0 ? `- ${formatINR(discount)}` : formatINR(0)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
            <dt>Total payable</dt>
            <dd className="text-accent">{formatINR(unit)}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
