const ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"],
  ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
];

// Which finger/home-key each key is closest to, used only to highlight the
// current target key — not a full finger-map, just a visual aid.
export const Keyboard = ({ activeKey }: { activeKey: string | null }) => {
  const target = (activeKey ?? "").toLowerCase();

  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      {ROWS.map((row, ri) => (
        <div key={ri} className="flex gap-1.5" style={{ marginLeft: ri === 1 ? 12 : ri === 2 ? 24 : 0 }}>
          {row.map((k) => (
            <div
              key={k}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-xs sm:text-sm font-semibold border transition-colors ${
                k === target
                  ? "bg-black text-white dark:bg-white dark:text-black border-transparent"
                  : "border-[var(--card-border)] text-black/50 dark:text-white/50"
              }`}
            >
              {k}
            </div>
          ))}
        </div>
      ))}
      <div
        className={`mt-1 w-56 sm:w-64 h-8 rounded-lg flex items-center justify-center text-xs font-semibold border transition-colors ${
          target === " "
            ? "bg-black text-white dark:bg-white dark:text-black border-transparent"
            : "border-[var(--card-border)] text-black/50 dark:text-white/50"
        }`}
      >
        space
      </div>
    </div>
  );
};
