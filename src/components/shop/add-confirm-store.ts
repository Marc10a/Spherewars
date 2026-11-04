"use client";

import { useSyncExternalStore } from "react";
import type { CartItem } from "./cart-store";

/** A same-faction single offered after adding to the cart. All values come from the catalogue; nothing here is a claim. */
export type RelatedItem = { id: string; name: string; href: string; image: string | null; price: string };

export type Confirmation = {
  open: boolean;
  item: Omit<CartItem, "qty">;
  qty: number;
  related: RelatedItem[];
  /** Where focus goes back to when the confirmation closes. */
  trigger: HTMLElement | null;
};

let state: Confirmation | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function showConfirmation(next: Omit<Confirmation, "open">) {
  state = { ...next, open: true };
  emit();
}

export function hideConfirmation() {
  if (state?.open) { state = { ...state, open: false }; emit(); }
}

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

export const useConfirmation = () => useSyncExternalStore(subscribe, () => state, () => null);
