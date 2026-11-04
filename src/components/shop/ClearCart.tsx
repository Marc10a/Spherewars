"use client";

import { useEffect } from "react";
import { cartActions } from "./cart-store";

const KEY = "sw_cleared_orders_v1";

/** Rendered on the "thank you" page once the order is confirmed paid. Each order empties the cart only once, so reopening its link later keeps a new cart. */
export function ClearCart({ order }: { order: string }) {
  useEffect(() => {
    let seen: string[] = [];
    try { seen = JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { /* unreadable: treat as none */ }
    if (!Array.isArray(seen)) seen = [];
    if (seen.includes(order)) return;
    try { localStorage.setItem(KEY, JSON.stringify([...seen, order].slice(-20))); } catch { /* private mode: the cart doesn't persist either */ }
    cartActions.clear();
  }, [order]);
  return null;
}
