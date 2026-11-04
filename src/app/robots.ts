import type { MetadataRoute } from "next";
import { gateActive } from "@/lib/site-gate";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  if (gateActive()) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin"] }, sitemap: `${base}/sitemap.xml` };
}
