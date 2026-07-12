import type { MetadataRoute } from "next";

const BASE_URL = "https://getbruh.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/settings",
        "/today",
        "/lists",
        "/calendar",
        "/focus",
        "/goals",
        "/habits",
        "/planning",
        "/timeline",
        "/stats",
        "/teams",
        "/archive",
        "/shutdown",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
