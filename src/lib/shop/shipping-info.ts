import { formatMoney } from "./pricing";

/**
 * The shipping prices the web tells the buyer, in cents, what they finally pay. The one place to change them here; WooCommerce charges its own zones
 * (set by the plugin's "Aplicar ajustes") and its checkout has the last word. If they change, change them in WooCommerce as well.
 */
export const SHIPPING_INFO = { spain: { cents: 500, freeOver: 5000 }, abroad: { cents: 1500, freeOver: 10000 } };

/** Fills a text with {spain}, {spainFree}, {abroad}, {abroadFree}. */
export const shippingInfoText = (template: string, locale: string) => template
  .replace("{spainFree}", formatMoney(SHIPPING_INFO.spain.freeOver, locale))
  .replace("{spain}", formatMoney(SHIPPING_INFO.spain.cents, locale))
  .replace("{abroadFree}", formatMoney(SHIPPING_INFO.abroad.freeOver, locale))
  .replace("{abroad}", formatMoney(SHIPPING_INFO.abroad.cents, locale));
