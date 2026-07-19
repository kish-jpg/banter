import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// The mark (Mono identity): an ink speech bubble on near-black, the wordmark's
// violet signal dot inside. Pure vector via satori-rendered SVG - no font dependency.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1c1811",
          borderRadius: 96,
        }}
      >
        <svg width="360" height="360" viewBox="0 0 100 100">
          <path
            d="M50 12c-23 0-40 14.5-40 33 0 10.5 5.5 19.8 14.5 25.8L20 86l17.5-8.5c4 .9 8.2 1.5 12.5 1.5 23 0 40-14.5 40-33S73 12 50 12z"
            fill="#f2ede2"
          />
          <circle cx="50" cy="45" r="7" fill="#4f7a52" />
        </svg>
      </div>
    ),
    size,
  );
}
