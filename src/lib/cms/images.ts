/** next/image throws for hosts it was not configured with, so only WordPress-hosted images (same host as WP_API_URL) are used as page images. */
export function cmsImageUrl(url: string | null | undefined): string | undefined {
  if (!url || !process.env.WP_API_URL) return undefined;
  try {
    return new URL(url).hostname === new URL(process.env.WP_API_URL).hostname ? url : undefined;
  } catch {
    return undefined;
  }
}
