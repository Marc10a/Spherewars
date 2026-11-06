import type { MetadataRoute } from "next";
import { gateActive } from "@/lib/site-gate";

import { siteUrl as base } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (gateActive()) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin"] }, sitemap: `${base}/sitemap.xml` };
}
