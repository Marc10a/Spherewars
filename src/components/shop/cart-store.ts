"use client";

import { useSyncExternalStore } from "react";

// Cart kept in the visitor's browser (localStorage). It stores only DISPLAY data and quantities:
// the server re-reads every price and the stock from the database at checkout, so tampering with it gains nothing.
export type CartItem = {
  id: string; slug: string; name: string; price_cents: number; image: string | null; qty: number; stock: number | null;
};

const KEY = "sw_cart_v1";
const MAX_QTY = 20;
const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let lastRaw: string | null = null;
let lastParsed: CartItem[] = EMPTY;

function parse(raw: string): CartItem[] {
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return EMPTY;
    return v.filter((i): i is CartItem => i && typeof i.id === "string" && Number.isInteger(i.qty) && i.qty > 0 && typeof i.price_cents === "number");
  } catch {
    return EMPTY;
  }
}

function snapshot(): CartItem[] {
  let raw = "";
  try { raw = localStorage.getItem(KEY) ?? ""; } catch { /* private mode: cart simply won't persist */ }
  if (raw !== lastRaw) { lastRaw = raw; lastParsed = raw ? parse(raw) : EMPTY; }
  return lastParsed;
}

function write(items: CartItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(); }; // other tabs
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); };
}

const clamp = (qty: number, stock: number | null) => Math.max(1, Math.min(qty, MAX_QTY, stock ?? MAX_QTY));

export const cartActions = {
  add(item: Omit<CartItem, "qty">, qty = 1) {
    const items = snapshot();
    const found = items.find((i) => i.id === item.id);
    write(found
      ? items.map((i) => (i.id === item.id ? { ...i, ...item, qty: clamp(i.qty + qty, item.stock) } : i))
      : [...items, { ...item, qty: clamp(qty, item.stock) }]);
  },
  /** `stock`, when given, is the live figure and replaces the stored copy, which can be old. */
  setQty(id: string, qty: number, stock?: number | null) {
    write(snapshot().map((i) => { const s = stock === undefined ? i.stock : stock; return i.id === id ? { ...i, stock: s, qty: clamp(qty, s) } : i; }));
  },
  /** Relative change computed from the stored quantity, so rapid clicks never use a stale value. */
  change(id: string, delta: number, stock?: number | null) {
    write(snapshot().map((i) => { const s = stock === undefined ? i.stock : stock; return i.id === id ? { ...i, stock: s, qty: clamp(i.qty + delta, s) } : i; }));
  },
  remove(id: string) { write(snapshot().filter((i) => i.id !== id)); },
  clear() { write([]); },
};

export function useCart() {
  const items = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  return { items, count: items.reduce((n, i) => n + i.qty, 0), ...cartActions };
}
