"use client";

/**
 * Texting DNA: a 4-axis radar of the user's average grades. warmth up,
 * specificity right, reciprocity down, naturalness left. Values are 1-5.
 */
export function DnaRadar({
  values,
}: {
  values: { warmth: number; specificity: number; reciprocity: number; naturalness: number };
}) {
  const C = 110; // center
  const R = 78; // full radius = score of 5

  // score -> point on axis (up, right, down, left)
  const pt = (score: number, axis: 0 | 1 | 2 | 3): [number, number] => {
    const r = (Math.max(1, Math.min(5, score)) / 5) * R;
    switch (axis) {
      case 0:
        return [C, C - r];
      case 1:
        return [C + r, C];
      case 2:
        return [C, C + r];
      default:
        return [C - r, C];
    }
  };

  const poly = [pt(values.warmth, 0), pt(values.specificity, 1), pt(values.reciprocity, 2), pt(values.naturalness, 3)]
    .map(([x, y]) => `${x},${y}`)
    .join(" ");

  const grid = (frac: number) =>
    [
      [C, C - R * frac],
      [C + R * frac, C],
      [C, C + R * frac],
      [C - R * frac, C],
    ]
      .map(([x, y]) => `${x},${y}`)
      .join(" ");

  const labels: { text: string; v: number; x: number; y: number; anchor: "start" | "middle" | "end" }[] = [
    { text: "warmth", v: values.warmth, x: C, y: C - R - 14, anchor: "middle" },
    { text: "specificity", v: values.specificity, x: C + R + 12, y: C + 4, anchor: "start" },
    { text: "reciprocity", v: values.reciprocity, x: C, y: C + R + 22, anchor: "middle" },
    { text: "naturalness", v: values.naturalness, x: C - R - 12, y: C + 4, anchor: "end" },
  ];

  return (
    <svg viewBox="0 0 220 220" className="mx-auto w-full max-w-[290px]" role="img" aria-label="Texting DNA radar">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={grid(f)} fill="none" stroke="currentColor" className="text-border" strokeWidth="1" />
      ))}
      <line x1={C} y1={C - R} x2={C} y2={C + R} stroke="currentColor" className="text-border" strokeWidth="1" />
      <line x1={C - R} y1={C} x2={C + R} y2={C} stroke="currentColor" className="text-border" strokeWidth="1" />
      <polygon points={poly} fill="oklch(0.68 0.19 13 / 0.18)" stroke="#ff5c7a" strokeWidth="2" strokeLinejoin="round" />
      {[pt(values.warmth, 0), pt(values.specificity, 1), pt(values.reciprocity, 2), pt(values.naturalness, 3)].map(
        ([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill="#ff5c7a" />
        ),
      )}
      {labels.map((l) => (
        <text
          key={l.text}
          x={l.x}
          y={l.y}
          textAnchor={l.anchor}
          className="fill-current text-muted-foreground"
          fontSize="10.5"
        >
          {l.text} {l.v.toFixed(1)}
        </text>
      ))}
    </svg>
  );
}
