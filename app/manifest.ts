import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VivaTrip Check Căn",
    short_name: "VivaTrip",
    description: "Công cụ nội bộ tìm villa / khách sạn / resort cho đội sale VivaTrip",
    start_url: "/search",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBF8F5",
    theme_color: "#EF4F58",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
