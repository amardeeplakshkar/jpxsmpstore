import { test } from "node:test";
import assert from "node:assert/strict";
import { activeStoreDiscount, priceProduct } from "lib/pricing";
import { maxQtyFor, parseCart, serializeCart } from "lib/cart";

const d10 = { percent: 10, label: "Sale", endsAt: null };

test("store discount applies to eligible products", () => {
  const p = priceProduct({ regularPricePaise: 19900, salePricePaise: null, discountEligible: true }, d10);
  assert.equal(p.unitPaise, 17910);
  assert.equal(p.savedPaise, 1990);
  assert.equal(p.percentOff, 10);
  assert.equal(p.source, "store");
});

test("opted-out products ignore the store discount", () => {
  const p = priceProduct({ regularPricePaise: 19900, salePricePaise: null, discountEligible: false }, d10);
  assert.equal(p.unitPaise, 19900);
  assert.equal(p.savedPaise, 0);
});

test("discounts never stack: lower price wins", () => {
  const sale = priceProduct({ regularPricePaise: 10000, salePricePaise: 7000, discountEligible: true }, d10);
  assert.equal(sale.unitPaise, 7000);
  assert.equal(sale.source, "sale");
  const store = priceProduct({ regularPricePaise: 10000, salePricePaise: 9500, discountEligible: true }, d10);
  assert.equal(store.unitPaise, 9000);
  assert.equal(store.source, "store");
});

test("discount activation respects enabled flag and end time", () => {
  assert.equal(activeStoreDiscount({ enabled: false, percent: 20, label: "x", endsAt: "" }), null);
  assert.ok(activeStoreDiscount({ enabled: true, percent: 20, label: "x", endsAt: "" }));
  const now = new Date("2026-11-15T12:00:00+05:30");
  assert.equal(activeStoreDiscount({ enabled: true, percent: 20, label: "x", endsAt: "2026-11-15T11:00" }, now), null);
  assert.ok(activeStoreDiscount({ enabled: true, percent: 20, label: "x", endsAt: "2026-11-15T13:00" }, now));
});

test("cart cookie round-trips and rejects junk", () => {
  const lines = [{ slug: "vip", qty: 1 }, { slug: "vote-key", qty: 3 }];
  assert.deepEqual(parseCart(serializeCart(lines)), lines);
  assert.deepEqual(parseCart("not-json"), []);
  assert.deepEqual(parseCart(encodeURIComponent(JSON.stringify([{ s: "../etc", q: 1 }, { s: "ok", q: 99 }, { s: "ok", q: 1 }]))), [{ slug: "ok", qty: 10 }]);
  assert.equal(maxQtyFor("RANK"), 1);
  assert.equal(maxQtyFor("CRATE"), 10);
});
