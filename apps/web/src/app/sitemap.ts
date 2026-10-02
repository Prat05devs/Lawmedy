import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/privacy", "/terms", "/refunds", "/contact", "/delete-account"].map((path) => ({
    url: `${site.url}${path}`,
    lastModified: new Date(),
  }));
}
