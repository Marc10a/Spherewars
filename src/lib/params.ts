/** A repeated query parameter (?q=a&q=b) arrives as an array: pages read the first value and never have to think about it. */
export const oneParam = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
