import React, { useMemo } from "react";

/**
 * QualityPulse — the product's signature visual mark.
 *
 * Turns a dataset's quality_score into a literal waveform of bars: clean
 * columns render tall and calm, columns "damaged" by missing values or
 * duplicates render short and warm-colored. It reads at a glance as both
 * a piece of brand identity and an honest picture of the data's shape,
 * rather than a generic progress bar.
 */
export default function QualityPulse({ score = 0, missing = 0, duplicates = 0, rows = 0, size = "md" }) {
  const bars = useMemo(() => {
    const count = 28;
    const damageRatio = Math.min(1, (missing + duplicates) / Math.max(rows, 1));
    const cleanBars = Math.round(count * (1 - damageRatio));
    const seedHeights = [0.55, 0.82, 0.68, 0.94, 0.6, 0.88, 0.72, 1, 0.65, 0.9];
    return Array.from({ length: count }, (_, i) => {
      const isClean = i < cleanBars;
      const height = seedHeights[i % seedHeights.length];
      return { isClean, height };
    });
  }, [score, missing, duplicates, rows]);

  const barHeight = size === "lg" ? 44 : 28;
  const barWidth = size === "lg" ? 5 : 3;
  const gap = size === "lg" ? 3 : 2;

  return (
    <div className="flex items-end gap-2">
      <div
        className="flex items-end"
        style={{ height: barHeight, gap }}
        role="img"
        aria-label={`Data quality pulse: ${score}% clean`}
      >
        {bars.map((b, i) => (
          <span
            key={i}
            className={[
              "rounded-full origin-bottom",
              b.isClean ? "bg-primary" : "bg-signal",
              b.isClean ? "animate-pulseBar" : "",
            ].join(" ")}
            style={{
              width: barWidth,
              height: `${b.height * 100}%`,
              animationDelay: `${(i % 10) * 90}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
