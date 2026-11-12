import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/auth/callback", "/portal/"],
      },
    ],
    sitemap: "https://bower.africa/sitemap.xml",
  }
}
