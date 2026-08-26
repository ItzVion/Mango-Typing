// Original stylized keyboard illustration — no stock photo, brand colors only.
// Rows of keycaps rendered as an SVG grid; parent controls the 45deg tilt.
export const KeyboardArt = () => {
  const rows = [14, 14, 13, 12, 8];
  const keySize = 34;
  const gap = 6;
  const width = 14 * (keySize + gap);
  const height = rows.length * (keySize + gap);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      {rows.map((count, rowIdx) => {
        const rowWidth = count * (keySize + gap) - gap;
        const offsetX = (width - rowWidth) / 2;
        return Array.from({ length: count }).map((_, colIdx) => {
          const x = offsetX + colIdx * (keySize + gap);
          const y = rowIdx * (keySize + gap);
          const isAccent = (rowIdx + colIdx) % 11 === 0;
          return (
            <rect
              key={`${rowIdx}-${colIdx}`}
              x={x}
              y={y}
              width={keySize}
              height={keySize}
              rx={7}
              fill={isAccent ? "#F5A623" : "rgba(255,255,255,0.06)"}
              stroke="rgba(255,255,255,0.14)"
              strokeWidth={1}
            />
          );
        });
      })}
    </svg>
  );
};
