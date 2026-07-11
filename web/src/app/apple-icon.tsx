import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS home-screen icon (Safari masks its own corners - solid background, no radius).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#151112",
        }}
      >
        <svg width="128" height="128" viewBox="0 0 100 100">
          <path
            d="M50 12c-23 0-40 14.5-40 33 0 10.5 5.5 19.8 14.5 25.8L20 86l17.5-8.5c4 .9 8.2 1.5 12.5 1.5 23 0 40-14.5 40-33S73 12 50 12z"
            fill="#ff5c7a"
          />
          <circle cx="50" cy="45" r="7" fill="#151112" />
        </svg>
      </div>
    ),
    size,
  );
}
