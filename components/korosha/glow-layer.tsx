/**
 * The ambient background.
 *
 * This is the only place purple appears as a large area. It sits behind
 * everything at z-index -1 and is `aria-hidden`, so body text always lands on
 * a dark panel above it rather than directly on a glow.
 *
 * No backdrop-filter here: the glows are painted, and the panels above supply
 * the single blur layer per element.
 */
export function GlowLayer() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[var(--background)]"
    >
      <div
        className="absolute -left-[10%] -top-[20%] h-[55vmax] w-[55vmax] rounded-full opacity-90"
        style={{
          background:
            "radial-gradient(circle at center, var(--glow-primary) 0%, transparent 68%)",
        }}
      />
      <div
        className="absolute -right-[15%] top-[10%] h-[45vmax] w-[45vmax] rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, var(--glow-secondary) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-[-25%] left-[25%] h-[50vmax] w-[50vmax] rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, var(--glow-secondary) 0%, transparent 72%)",
        }}
      />
    </div>
  );
}
