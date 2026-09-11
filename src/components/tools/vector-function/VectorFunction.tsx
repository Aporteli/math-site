'use client';

import { useState } from 'react';
import { MathPlot3D } from '@/components/tools/vector-function/MathPlot3D';
import type { VectorFunctionLoaderProps } from './VectorFunctionLoader';
import { ToolHeader } from '@/components/ui/ToolHeader';
// ვექტორული ფუნქციებისთვის შესაფერისი აიკონი
import { ArrowUpRight } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';

// მზა პრეფორმულირებული მაგალითები
const PRESETS = [
  { name: 'Helix (სპირალი)', x: 'cos(t)', y: 'sin(t)', z: 't / 2', tMin: -10, tMax: 10 },
  {
    name: 'Trefoil Knot (კვანძი)',
    x: 'sin(t) + 2*sin(2*t)',
    y: 'cos(t) - 2*cos(2*t)',
    z: '-sin(3*t)',
    tMin: 0,
    tMax: 6.28,
  },
  { name: "Viviani's Curve (8-იანი)", x: '1 + cos(t)', y: 'sin(t)', z: '2*sin(t/2)', tMin: -6.28, tMax: 6.28 },
  { name: '3D Rose (ვარდი)', x: 'cos(3*t)*cos(t)', y: 'cos(3*t)*sin(t)', z: 'sin(3*t)', tMin: 0, tMax: 6.28 },
];

export default function VectorFunction({ locale, copy, title, description }: VectorFunctionLoaderProps) {
  const [xExpr, setXExpr] = useState('cos(t)');
  const [yExpr, setYExpr] = useState('sin(t)');
  const [zExpr, setZExpr] = useState('t / 2');

  // დიაპაზონის პარამეტრები
  const [tMin, setTMin] = useState<number>(-10);
  const [tMax, setTMax] = useState<number>(10);
  const [numPoints, setNumPoints] = useState<number>(300);

  const [plotData, setPlotData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleCalculate = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/eval-curve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x_expr: xExpr,
          y_expr: yExpr,
          z_expr: zExpr,
          t_min: Number(tMin),
          t_max: Number(tMax),
          num_points: Number(numPoints),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'მათემატიკური გამოსახულება არასწორია.');
      }

      setPlotData(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'სერვერთან კავშირი ვერ დამყარდა.');
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setXExpr(preset.x);
    setYExpr(preset.y);
    setZExpr(preset.z);
    setTMin(preset.tMin);
    setTMax(preset.tMax);
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8 min-h-screen text-ink">
      {/* Header & Main Control Panel */}
      <BackButton href="/ka/tools" />
      <ToolHeader
        title="3D ვექტორული წირის დახაზვა"
        description="ვექტორული გამოსახულების დახაზვა 3D გრაფიკზე"
        category=""
        icon={<ArrowUpRight className="size-4" />}
      />
      <div className="rounded-3xl border border-hairline bg-surface p-6 shadow-sm sm:p-8 space-y-6">
        {/* Presets Selection */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="rounded-lg border border-hairline bg-paper-deep/40 px-3 py-1.5 text-xs font-medium text-ink transition-all hover:bg-navy hover:text-white">
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Vector Functions Inputs */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-body">{copy?.xComponent || 'X(t) ='}</label>
            <input
              type="text"
              value={xExpr}
              onChange={(e) => setXExpr(e.target.value)}
              className="w-full rounded-xl border border-hairline bg-paper-deep/30 px-3.5 py-2.5 font-mono text-sm text-ink shadow-sm transition-colors focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-body">{copy?.yComponent || 'Y(t) ='}</label>
            <input
              type="text"
              value={yExpr}
              onChange={(e) => setYExpr(e.target.value)}
              className="w-full rounded-xl border border-hairline bg-paper-deep/30 px-3.5 py-2.5 font-mono text-sm text-ink shadow-sm transition-colors focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-body">{copy?.zComponent || 'Z(t) ='}</label>
            <input
              type="text"
              value={zExpr}
              onChange={(e) => setZExpr(e.target.value)}
              className="w-full rounded-xl border border-hairline bg-paper-deep/30 px-3.5 py-2.5 font-mono text-sm text-ink shadow-sm transition-colors focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
        </div>

        {/* Domain Controls (t_min, t_max, points) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2 border-t border-hairline/60">
          <div>
            <label className="mb-1 block text-xs text-body">t min:</label>
            <input
              type="number"
              value={tMin}
              onChange={(e) => setTMin(Number(e.target.value))}
              className="w-full rounded-lg border border-hairline bg-paper-deep/20 px-3 py-1.5 font-mono text-xs text-ink"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-body">t max:</label>
            <input
              type="number"
              value={tMax}
              onChange={(e) => setTMax(Number(e.target.value))}
              className="w-full rounded-lg border border-hairline bg-paper-deep/20 px-3 py-1.5 font-mono text-xs text-ink"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-body">წერტილების რაოდენობა:</label>
            <input
              type="number"
              value={numPoints}
              onChange={(e) => setNumPoints(Number(e.target.value))}
              className="w-full rounded-lg border border-hairline bg-paper-deep/20 px-3 py-1.5 font-mono text-xs text-ink"
            />
          </div>
        </div>

        {/* Custom Professional Error Banner */}
        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 text-xs font-medium text-red-600">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleCalculate}
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-xl bg-navy px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-navy-strong focus:outline-none focus:ring-2 focus:ring-navy/20 disabled:opacity-50">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              მიმდინარეობს გამოთვლა...
            </span>
          ) : (
            'დახაზე 3D ვექტორული წირი'
          )}
        </button>
      </div>

      {/* Plot Canvas Box */}
      <div className="overflow-hidden rounded-3xl border border-hairline bg-surface p-2 shadow-sm">
        <MathPlot3D data={plotData} />
      </div>
    </main>
  );
}
