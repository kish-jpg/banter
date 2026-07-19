import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Share cards (PRD §7.8): The Read / Texting DNA / We Met, server-rendered PNG.
 * Everything on a card arrives via query params the CLIENT chose after the
 * consent preview — this route never sees threads, personas, or raw text beyond
 * the single quote the user explicitly picked. Bands only, never percentages.
 * 9:16 (fmt=story) and 4:5 (fmt=post), verdict readable at thumbnail size.
 */

export const runtime = "nodejs";

// Bloom identity: warm cream paper, ink text, one forest-green signal for good news.
const BG = "#f2ede2";
const SURFACE = "#faf7ef";
const TRACK = "rgba(33,28,21,0.1)";
const BORDER = "rgba(33,28,21,0.13)";
const FG = "#211c15";
const MUTED = "#857c6c";
const CORAL = "#4f7a52"; // the signal forest green
const CORAL_DIM = "rgba(79,122,82,0.14)";
const WARM_FILL = "rgba(33,28,21,0.38)";

const BAND_FILL: Record<string, number> = { low: 0.3, warming: 0.62, strong: 0.92 };

async function jakarta(weight: string) {
  return readFile(
    path.join(
      process.cwd(),
      "node_modules",
      "@fontsource",
      "plus-jakarta-sans",
      "files",
      `plus-jakarta-sans-latin-${weight}-normal.woff`,
    ),
  );
}

async function serif() {
  return readFile(
    path.join(
      process.cwd(),
      "node_modules",
      "@fontsource",
      "instrument-serif",
      "files",
      "instrument-serif-latin-400-normal.woff",
    ),
  );
}

function Wordmark({ size = 46 }: { size?: number }) {
  return (
    <div style={{ display: "flex", fontFamily: "Serif", fontSize: size, color: FG }}>
      banter<span style={{ color: CORAL }}>.</span>
    </div>
  );
}

function Footer({ hook, refCode }: { hook: string; refCode: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", fontSize: 40, color: MUTED }}>{hook}</div>
      <div
        style={{
          display: "flex",
          alignSelf: "flex-start",
          fontSize: 36,
          fontWeight: 600,
          color: CORAL,
          backgroundColor: CORAL_DIM,
          padding: "16px 32px",
          borderRadius: 999,
        }}
      >
        banter-tau.vercel.app/r/{refCode}
      </div>
    </div>
  );
}

function BandRow({ label, band }: { label: string; band: string }) {
  const fill = BAND_FILL[band] ?? 0.3;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
      <div style={{ display: "flex", width: 300, fontSize: 34, color: MUTED }}>{label}</div>
      <div style={{ display: "flex", flex: 1, height: 18, backgroundColor: TRACK, borderRadius: 999 }}>
        <div
          style={{
            display: "flex",
            width: `${fill * 100}%`,
            height: 18,
            backgroundColor: band === "strong" ? CORAL : WARM_FILL,
            borderRadius: 999,
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          width: 170,
          fontSize: 32,
          fontWeight: 600,
          color: band === "strong" ? CORAL : FG,
          justifyContent: "flex-end",
        }}
      >
        {band}
      </div>
    </div>
  );
}

function ReadCard(p: URLSearchParams, tall: boolean) {
  const quote = p.get("q");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: BG,
        padding: tall ? 96 : 72,
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Wordmark />
        <div
          style={{
            display: "flex",
            fontSize: 30,
            color: MUTED,
            backgroundColor: SURFACE,
            padding: "12px 28px",
            borderRadius: 999,
          }}
        >
          {p.get("stage") ?? "the read"}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: tall ? 56 : 40 }}>
        <div
          style={{
            display: "flex",
            fontFamily: "Serif",
            fontSize: tall ? 108 : 88,
            color: FG,
            lineHeight: 1.02,
          }}
        >
          {p.get("sig") ?? "the read is in"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <BandRow label="interest" band={p.get("i") ?? "warming"} />
          <BandRow label="warmth" band={p.get("w") ?? "warming"} />
          <BandRow label="reciprocity" band={p.get("r") ?? "warming"} />
          <BandRow label="momentum" band={p.get("m") ?? "warming"} />
        </div>

        {quote && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: SURFACE,
              borderRadius: 28,
              padding: "36px 44px",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", fontSize: 38, color: FG, lineHeight: 1.35 }}>
              {"“"}{quote}{"”"}
            </div>
            <div style={{ display: "flex", fontSize: 28, color: MUTED }}>they said</div>
          </div>
        )}
      </div>

      <Footer hook="what would the read say about yours?" refCode={p.get("ref") ?? "banter"} />
    </div>
  );
}

function radarPoints(vals: number[], cx: number, cy: number, r: number): string {
  // 4 axes: top, right, bottom, left. vals 0..1.
  const pts = [
    [cx, cy - r * vals[0]],
    [cx + r * vals[1], cy],
    [cx, cy + r * vals[2]],
    [cx - r * vals[3], cy],
  ];
  return pts.map(([x, y]) => `${x},${y}`).join(" ");
}

function DnaCard(p: URLSearchParams, tall: boolean) {
  const dims = ["w", "sp", "rc", "n"].map((k) => {
    const v = Number(p.get(k) ?? 3);
    return Math.min(1, Math.max(0.12, v / 5));
  });
  const R = tall ? 260 : 200;
  const S = R * 2 + 40;
  const c = S / 2;
  const labels = ["warmth", "specificity", "reciprocity", "naturalness"];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: BG,
        padding: tall ? 96 : 72,
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Wordmark />
        <div style={{ display: "flex", fontSize: 30, color: MUTED }}>my texting dna</div>
      </div>

      <div style={{ display: "flex", position: "relative", width: S + 240, height: S + 100, alignItems: "center", justifyContent: "center" }}>
        <svg width={S} height={S}>
          {[1, 0.66, 0.33].map((g) => (
            <polygon
              key={g}
              points={radarPoints([g, g, g, g], c, c, R)}
              fill="none"
              stroke={BORDER}
              strokeWidth={2}
            />
          ))}
          <line x1={c} y1={c - R} x2={c} y2={c + R} stroke={BORDER} strokeWidth={2} />
          <line x1={c - R} y1={c} x2={c + R} y2={c} stroke={BORDER} strokeWidth={2} />
          <polygon
            points={radarPoints(dims, c, c, R)}
            fill="rgba(79,122,82,0.20)"
            stroke={CORAL}
            strokeWidth={5}
          />
        </svg>
        {/* labels pinned to their axes: top, right, bottom, left */}
        <div style={{ display: "flex", position: "absolute", top: 6, left: 0, width: "100%", justifyContent: "center", fontSize: 28, color: MUTED }}>
          {labels[0]}
        </div>
        <div style={{ display: "flex", position: "absolute", right: 0, top: "46%", fontSize: 28, color: MUTED }}>
          {labels[1]}
        </div>
        <div style={{ display: "flex", position: "absolute", bottom: 6, left: 0, width: "100%", justifyContent: "center", fontSize: 28, color: MUTED }}>
          {labels[2]}
        </div>
        <div style={{ display: "flex", position: "absolute", left: 0, top: "46%", fontSize: 28, color: MUTED }}>
          {labels[3]}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            display: "flex",
            fontFamily: "Serif",
            fontSize: tall ? 108 : 90,
            color: FG,
            lineHeight: 1.02,
          }}
        >
          {p.get("a") ?? "The Slow Burner"}
        </div>
        <div style={{ display: "flex", fontSize: 40, color: CORAL }}>{p.get("t") ?? ""}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          {[p.get("s1"), p.get("s2")].filter(Boolean).map((s) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 36, color: FG }}>
              <div style={{ display: "flex", width: 14, height: 14, borderRadius: 99, backgroundColor: CORAL }} />
              {s}
            </div>
          ))}
          {p.get("g") && (
            <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 36, color: MUTED }}>
              <div style={{ display: "flex", width: 14, height: 14, borderRadius: 99, backgroundColor: MUTED }} />
              growth edge: {p.get("g")}
            </div>
          )}
        </div>
      </div>

      <Footer hook="what's your texting dna?" refCode={p.get("ref") ?? "banter"} />
    </div>
  );
}

function MetCard(p: URLSearchParams, tall: boolean) {
  const fade = (p.get("f") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => !Number.isNaN(n));
  const days = p.get("d");
  const W = 620;
  const H = 180;
  const line =
    fade.length >= 2
      ? fade
          .map((v, i) => `${(i / (fade.length - 1)) * W},${H - (Math.min(100, Math.max(0, v)) / 100) * H}`)
          .join(" ")
      : null;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: BG,
        padding: tall ? 96 : 72,
        justifyContent: "space-between",
      }}
    >
      <Wordmark />

      <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
        <div
          style={{
            display: "flex",
            fontFamily: "Serif",
            fontSize: tall ? 168 : 132,
            color: FG,
            lineHeight: 1,
          }}
        >
          we met<span style={{ color: CORAL }}>.</span>
        </div>
        {days && (
          <div style={{ display: "flex", fontSize: 46, color: MUTED }}>
            {days} days from first hi to real life
          </div>
        )}
        {line && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 20 }}>
            <svg width={W} height={H}>
              <polyline points={line} fill="none" stroke={CORAL} strokeWidth={7} />
            </svg>
            <div style={{ display: "flex", fontSize: 32, color: MUTED }}>
              coaching faded as it got real
            </div>
          </div>
        )}
      </div>

      <Footer hook="the coach that fires itself" refCode={p.get("ref") ?? "banter"} />
    </div>
  );
}

export async function GET(req: Request, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  const url = new URL(req.url);
  const p = url.searchParams;
  const tall = (p.get("fmt") ?? "story") !== "post";
  const width = 1080;
  const height = tall ? 1920 : 1350;

  let body: React.ReactElement;
  if (kind === "read") body = ReadCard(p, tall);
  else if (kind === "dna") body = DnaCard(p, tall);
  else if (kind === "met") body = MetCard(p, tall);
  else return new Response("unknown card", { status: 404 });

  const [regular, semibold, bold, serifData] = await Promise.all([
    jakarta("400"),
    jakarta("600"),
    jakarta("700"),
    serif(),
  ]);

  return new ImageResponse(body, {
    width,
    height,
    fonts: [
      { name: "Jakarta", data: regular, weight: 400, style: "normal" },
      { name: "Jakarta", data: semibold, weight: 600, style: "normal" },
      { name: "Jakarta", data: bold, weight: 700, style: "normal" },
      { name: "Serif", data: serifData, weight: 400, style: "normal" },
    ],
  });
}
