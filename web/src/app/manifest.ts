import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Banter — know what to say",
    short_name: "Banter",
    description:
      "Your texting coach. Reads the conversation, tells you what's working, and helps you say it like you.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2ede2",
    theme_color: "#f2ede2",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
