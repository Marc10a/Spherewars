import { Check } from "lucide-react";

/**
 * Where the buyer is: Carrito → Datos y pago → Confirmación. Step 2 happens on the shop's WooCommerce checkout, which draws the same bar
 * (woo-local/deploy/spherewars-tienda: sw_checkout_steps() and .sw-steps in brand.css). Change one, change the other.
 */
export function CheckoutSteps({ current, labels }: { current: 1 | 2 | 3; labels: { label: string; cart: string; pay: string; done: string } }) {
  const steps = [labels.cart, labels.pay, labels.done];
  return (
    <ol aria-label={labels.label} className="grid w-full max-w-md grid-cols-3">
      {steps.map((name, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "current" : "next";
        const line = (on: boolean, hide: boolean) => <span aria-hidden className={`h-px flex-1 ${hide ? "invisible" : on ? "bg-gold" : "bg-stone/35"}`} />;
        return (
          <li key={name} aria-current={state === "current" ? "step" : undefined}>
            <span className="flex w-full items-center">
              {line(n <= current, n === 1)}
              <span aria-hidden className={`grid size-8 shrink-0 place-items-center border font-display text-base tabular-nums ${state === "done" ? "border-gold bg-gold text-abyss" : state === "current" ? "border-gold text-gold" : "border-stone/50 text-stone"}`}>
                {state === "done" ? <Check size={16} strokeWidth={2.5} /> : n}
              </span>
              {line(n < current, n === 3)}
            </span>
            <span className={`mt-1.5 block text-center font-display text-sm leading-tight sm:text-base ${state === "next" ? "text-stone" : state === "current" ? "text-gold" : "text-ivory"}`}>{name}</span>
          </li>
        );
      })}
    </ol>
  );
}
