"use client";

import { useEffect } from "react";
import { cartActions } from "./cart-store";

/** Rendered on the "thank you" page once the order is confirmed paid. */
export function ClearCart() {
  useEffect(() => { cartActions.clear(); }, []);
  return null;
}
