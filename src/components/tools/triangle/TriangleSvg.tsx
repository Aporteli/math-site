'use client';

import type { TriangleSolution } from './triangle';

interface Props {
  solution: TriangleSolution;
}

const W = 520;
const H = 400;
const PAD = 70;

function fmt(n: number, digits = 3): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(digits);
}

export function TriangleSvg({ solution }: Props) {
  const { a, b, c, A, B, C } = solution;

  // A = (0, 0), B = (c, 0), C = (x, y)
  const xC = (b * b + c * c - a * a) / (2 * c);
  const yC = Math.sqrt(Math.max(0, b * b - xC * xC));

  const xs = [0, c, xC];
  const ys = [0, yC];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const scaleX = (W - 2 * PAD) / spanX;
  const scaleY = (H - 2 * PAD) / spanY;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = (W - spanX * scale) / 2;
  const offsetY = (H - spanY * scale) / 2;

  function tx(x: number) {
    return offsetX + (x - minX) * scale;
  }
  function ty(y: number) {
    return H - offsetY - (y - minY) * scale;
  }

  const Ax = tx(0), Ay = ty(0);
  const Bx = tx(c), By = ty(0);
  const Cx = tx(xC), Cy = ty(yC);

  const midAB = { x: (Ax + Bx) / 2, y: (Ay + By) / 2 };
  const midBC = { x: (Bx + Cx) / 2, y: (By + Cy) / 2 };
  const midCA = { x: (Cx + Ax) / 2, y: (Cy + Ay) / 2 };

  return (
    <div className="overflow-hidden rounded-box border border-hairline bg-white p-2 dark:bg-slate-900 dark:border-slate-700">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full max-w-2xl mx-auto">
        {/* Fill */}
        <polygon
          points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}`}
          fill="rgba(37, 99, 235, 0.08)"
          stroke="#2563eb"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Side labels */}
        <text
          x={midAB.x}
          y={midAB.y + 22}
          fontSize="14"
          fontStyle="italic"
          fill="#64748b"
          textAnchor="middle"
          fontFamily="ui-monospace, monospace">
          c = {fmt(c, 3)}
        </text>
        <text
          x={midBC.x + 14}
          y={midBC.y + 4}
          fontSize="14"
          fontStyle="italic"
          fill="#64748b"
          fontFamily="ui-monospace, monospace">
          a = {fmt(a, 3)}
        </text>
        <text
          x={midCA.x - 14}
          y={midCA.y + 4}
          fontSize="14"
          fontStyle="italic"
          fill="#64748b"
          textAnchor="end"
          fontFamily="ui-monospace, monospace">
          b = {fmt(b, 3)}
        </text>

        {/* Vertices */}
        <circle cx={Ax} cy={Ay} r={5} fill="#2563eb" />
        <circle cx={Bx} cy={By} r={5} fill="#2563eb" />
        <circle cx={Cx} cy={Cy} r={5} fill="#2563eb" />

        {/* Vertex labels */}
        <text
          x={Ax - 18}
          y={Ay + 8}
          fontSize="18"
          fontWeight="700"
          fill="#1e293b"
          fontFamily="ui-monospace, monospace">
          A
        </text>
        <text
          x={Bx + 10}
          y={By + 8}
          fontSize="18"
          fontWeight="700"
          fill="#1e293b"
          fontFamily="ui-monospace, monospace">
          B
        </text>
        <text
          x={Cx}
          y={Cy - 14}
          fontSize="18"
          fontWeight="700"
          fill="#1e293b"
          textAnchor="middle"
          fontFamily="ui-monospace, monospace">
          C
        </text>

        {/* Angle labels */}
        <text
          x={Ax + 34}
          y={Ay - 8}
          fontSize="12"
          fill="#dc2626"
          fontWeight="600"
          fontFamily="ui-monospace, monospace">
          {fmt(A, 2)}°
        </text>
        <text
          x={Bx - 52}
          y={By - 8}
          fontSize="12"
          fill="#dc2626"
          fontWeight="600"
          fontFamily="ui-monospace, monospace">
          {fmt(B, 2)}°
        </text>
        <text
          x={Cx}
          y={Cy + 24}
          fontSize="12"
          fill="#dc2626"
          fontWeight="600"
          textAnchor="middle"
          fontFamily="ui-monospace, monospace">
          {fmt(C, 2)}°
        </text>
      </svg>
    </div>
  );
}