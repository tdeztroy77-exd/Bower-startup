import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bower — Property Operations",
    short_name: "Bower",
    description: "A quieter property workspace for landlords and agencies in Africa.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f7f4ec",
    theme_color: "#17624a",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon-light-32x32.png", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  }
}
