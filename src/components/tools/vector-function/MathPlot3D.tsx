"use client";

import dynamic from "next/dynamic";
import Plotly from "plotly.js-dist-min";
import type {
  Data,
  Layout,
  PlotMouseEvent,
  PlotRelayoutEvent,
} from "plotly.js";
import { useMemo, useRef } from "react";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
});

interface MathPlot3DProps {
  data: {
    curve: {
      x: number[];
      y: number[];
      z: number[];
    };
    bounds?: {
      max_r: number;
      max_z: number;
    };
  } | null;
}

type AxisName = "x" | "y" | "z";

/* ──────────────────────────────────────────────────────────────
 * Design tokens — Desmos-inspired professional palette
 * ────────────────────────────────────────────────────────────── */

const COLORS = {
  // Axes & structure
  axis: "#4b5563",
  axisHover: "#2563eb",
  grid: "#cbd5e1",
  gridStrong: "#e2e8f0",
  number: "#64748b",
  label: "#1e293b",

  // Curve
  curve: "#e11d48",
  curveGlow: "rgba(225, 29, 72, 0.18)",

  // UI
  paper: "#ffffff",
  border: "#e2e8f0",
  muted: "#94a3b8",
  surface: "rgba(255, 255, 255, 0.92)",
} as const;

const AXIS_WIDTH = {
  default: 3.5,
  hover: 6.5,
} as const;

export function MathPlot3D({ data }: MathPlot3DProps) {
  const graphDivRef = useRef<any>(null);

  // Camera lives outside React state so orbiting never triggers a re-render
  const cameraRef = useRef({
    eye: { x: 1.55, y: 1.55, z: 1.25 },
    center: { x: 0, y: 0, z: 0 },
    up: { x: 0, y: 0, z: 1 },
  });

  const hoveredAxisRef = useRef<AxisName | null>(null);

  /* ────────────────────────────────────────────────────────────
   * Bounds & tick generation
   * ──────────────────────────────────────────────────────────── */

  const { range, tickValues } = useMemo(() => {
    if (!data?.curve) {
      return { range: 5, tickValues: [] as number[] };
    }

    const maxR = data.bounds?.max_r ?? 5;
    const maxZ = data.bounds?.max_z ?? 5;
    const maxAxis = Math.max(maxR, maxZ, 1);

    // Generous padding so the curve never feels cramped against the edge
    const calculatedRange = Math.max(1.5, Math.ceil(maxAxis * 1.2));

    const tickStart = -Math.floor(maxAxis);
    const tickEnd = Math.floor(maxAxis);
    const ticks: number[] = [];

    for (let i = tickStart; i <= tickEnd; i++) {
      // Skip zero — origin is marked separately for a cleaner look
      if (i !== 0) ticks.push(i);
    }

    return {
      range: calculatedRange,
      tickValues: ticks,
    };
  }, [data]);

  /* ────────────────────────────────────────────────────────────
   * Plot data
   * ──────────────────────────────────────────────────────────── */

  const plotData: Data[] = useMemo(() => {
    if (!data?.curve) return [];

    // ── Primary axes ──────────────────────────────────────────
    const makeAxis = (
      name: AxisName,
      coords: { x: number[]; y: number[]; z: number[] }
    ): Data => ({
      type: "scatter3d",
      mode: "lines",
      x: coords.x,
      y: coords.y,
      z: coords.z,
      line: {
        color: COLORS.axis,
        width: AXIS_WIDTH.default,
      },
      customdata: [name, name],
      hovertemplate:
        name === "x"
          ? "<b>X</b><br>%{x:.2f}<extra></extra>"
          : name === "y"
            ? "<b>Y</b><br>%{y:.2f}<extra></extra>"
            : "<b>Z</b><br>%{z:.2f}<extra></extra>",
      showlegend: false,
      hoverinfo: "all",
    });

    const xAxis = makeAxis("x", {
      x: [-range, range],
      y: [0, 0],
      z: [0, 0],
    });
    const yAxis = makeAxis("y", {
      x: [0, 0],
      y: [-range, range],
      z: [0, 0],
    });
    const zAxis = makeAxis("z", {
      x: [0, 0],
      y: [0, 0],
      z: [-range, range],
    });

    // ── Tick numbers ──────────────────────────────────────────
    const numberStyle = {
      color: COLORS.number,
      size: 11,
      family: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
    };

    const xNumbers: Data = {
      type: "scatter3d",
      mode: "text",
      x: tickValues,
      y: tickValues.map(() => 0),
      z: tickValues.map(() => 0),
      text: tickValues.map(String),
      textfont: numberStyle,
      textposition: "top center",
      hoverinfo: "skip",
      showlegend: false,
    };

    const yNumbers: Data = {
      type: "scatter3d",
      mode: "text",
      x: tickValues.map(() => 0),
      y: tickValues,
      z: tickValues.map(() => 0),
      text: tickValues.map(String),
      textfont: numberStyle,
      textposition: "top center",
      hoverinfo: "skip",
      showlegend: false,
    };

    const zNumbers: Data = {
      type: "scatter3d",
      mode: "text",
      x: tickValues.map(() => 0),
      y: tickValues.map(() => 0),
      z: tickValues,
      text: tickValues.map(String),
      textfont: numberStyle,
      textposition: "middle right",
      hoverinfo: "skip",
      showlegend: false,
    };

    // ── Axis end labels (X / Y / Z) ───────────────────────────
    const axisLabels: Data = {
      type: "scatter3d",
      mode: "text",
      x: [range * 1.04, 0, 0],
      y: [0, range * 1.04, 0],
      z: [0, 0, range * 1.04],
      text: ["X", "Y", "Z"],
      textfont: {
        color: COLORS.label,
        size: 15,
        family: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
      },
      hoverinfo: "skip",
      showlegend: false,
    };

    // ── Subtle direction markers at positive ends ─────────────
    const directionMarkers: Data = {
      type: "scatter3d",
      mode: "markers",
      x: [range, 0, 0],
      y: [0, range, 0],
      z: [0, 0, range],
      marker: {
        size: 4,
        color: COLORS.axis,
        symbol: "circle",
        opacity: 0.85,
      },
      hoverinfo: "skip",
      showlegend: false,
    };

    // ── Origin marker ─────────────────────────────────────────
    const origin: Data = {
      type: "scatter3d",
      mode: "markers",
      x: [0],
      y: [0],
      z: [0],
      marker: {
        size: 5,
        color: COLORS.label,
        symbol: "circle",
        opacity: 0.9,
      },
      hovertemplate: "<b>Origin</b><br>(0, 0, 0)<extra></extra>",
      showlegend: false,
    };

    // ── Main parametric curve ─────────────────────────────────
    const curveTrace: Data = {
      type: "scatter3d",
      mode: "lines",
      x: data.curve.x,
      y: data.curve.y,
      z: data.curve.z,
      line: {
        color: COLORS.curve,
        width: 7,
      },
      name: "r(t)",
      hovertemplate:
        "<b>r(t)</b><br>" +
        "x = %{x:.3f}<br>" +
        "y = %{y:.3f}<br>" +
        "z = %{z:.3f}" +
        "<extra></extra>",
      showlegend: false,
    };

    return [
      xAxis,
      yAxis,
      zAxis,
      xNumbers,
      yNumbers,
      zNumbers,
      axisLabels,
      directionMarkers,
      origin,
      curveTrace,
    ];
  }, [data, range, tickValues]);

  /* ────────────────────────────────────────────────────────────
   * Layout
   * ──────────────────────────────────────────────────────────── */

  const layout: Partial<Layout> = useMemo(() => {
    const axisConfig = {
      title: { text: "" },
      range: [-range, range] as [number, number],
      showticklabels: false,
      ticks: "" as const,
      showgrid: true,
      gridcolor: COLORS.grid,
      gridwidth: 1,
      showbackground: false,
      zeroline: false,
      showline: false,
      showspikes: false,
      nticks: Math.max(6, Math.floor(range * 2) + 1),
    };

    return {
      autosize: true,
      paper_bgcolor: COLORS.paper,
      plot_bgcolor: COLORS.paper,
      margin: { l: 0, r: 0, t: 0, b: 0 },
      showlegend: false,
      hovermode: "closest",
      hoverlabel: {
        bgcolor: "rgba(15, 23, 42, 0.92)",
        bordercolor: "transparent",
        font: {
          family: "Inter, ui-sans-serif, system-ui, sans-serif",
          size: 12,
          color: "#f8fafc",
        },
        align: "left" as const,
      },
      scene: {
        uirevision: "3d-plot-camera",
        aspectmode: "cube",
        bgcolor: COLORS.paper,
        xaxis: axisConfig,
        yaxis: axisConfig,
        zaxis: axisConfig,
        camera: cameraRef.current,
        dragmode: "orbit",
      },
    };
  }, [range]);

  /* ────────────────────────────────────────────────────────────
   * Event handlers
   * ──────────────────────────────────────────────────────────── */

  const handleInitialized = (_figure: any, graphDiv: any) => {
    graphDivRef.current = graphDiv;
  };

  const handleRelayout = (event: PlotRelayoutEvent) => {
    const nextCamera = (event as any)["scene.camera"];
    if (nextCamera) {
      cameraRef.current = nextCamera;
    }
  };

  const getAxisIndex = (axis: AxisName): number => {
    switch (axis) {
      case "x":
        return 0;
      case "y":
        return 1;
      case "z":
        return 2;
    }
  };

  const setAxisStyle = (axis: AxisName, width: number, color: string) => {
    if (!graphDivRef.current) return;

    Plotly.restyle(
      graphDivRef.current,
      {
        "line.width": width,
        "line.color": color,
      }as any,
      [getAxisIndex(axis)]
    );
  };

  const handleHover = (event: PlotMouseEvent) => {
    const point = event.points?.[0];
    if (!point) return;

    const custom = point.customdata;
    if (custom !== "x" && custom !== "y" && custom !== "z") return;

    const axis = custom as AxisName;
    if (hoveredAxisRef.current === axis) return;

    // Restore previous axis
    if (hoveredAxisRef.current) {
      setAxisStyle(
        hoveredAxisRef.current,
        AXIS_WIDTH.default,
        COLORS.axis
      );
    }

    // Highlight new axis
    setAxisStyle(axis, AXIS_WIDTH.hover, COLORS.axisHover);
    hoveredAxisRef.current = axis;
  };

  const handleUnhover = () => {
    if (!hoveredAxisRef.current) return;

    setAxisStyle(
      hoveredAxisRef.current,
      AXIS_WIDTH.default,
      COLORS.axis
    );
    hoveredAxisRef.current = null;
  };

  /* ────────────────────────────────────────────────────────────
   * Empty state
   * ──────────────────────────────────────────────────────────── */

  if (!data?.curve) {
    return (
      <div className="flex h-[650px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100/80">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-400"
          >
            <path d="M12 3v18M3 12h18" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-600">
            3D პარამეტრული წირი
          </p>
          <p className="max-w-[240px] text-xs leading-relaxed text-slate-400">
            დააჭირეთ „დახაზე 3D წირი“ რათა ააგოთ და დაათვალიეროთ წირი
          </p>
        </div>
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────────
   * Render
   * ──────────────────────────────────────────────────────────── */

  return (
    <div className="relative h-[650px] w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]">
      {/* Floating curve badge */}
      <div className="pointer-events-none absolute left-3.5 top-3.5 z-10 flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/90 px-3 py-1.5 text-[11px] font-medium tracking-wide text-slate-600 shadow-sm backdrop-blur-md">
        <span
          className="h-2 w-2 rounded-full ring-2 ring-rose-500/20"
          style={{ backgroundColor: COLORS.curve }}
        />
        <span className="font-semibold text-slate-700">r(t)</span>
      </div>

      <Plot
        data={plotData}
        layout={layout}
        onInitialized={handleInitialized}
        onRelayout={handleRelayout}
        onHover={handleHover}
        onUnhover={handleUnhover}
        useResizeHandler
        config={{
          responsive: true,
          displaylogo: false,
          modeBarButtonsToRemove: [
            "toImage",
            "resetCameraLastSave3d",
            "hoverClosest3d",
          ],
          scrollZoom: true,
          displayModeBar: "hover",
          hoverdistance: 18,
          doubleClick: "reset",
        }}
        className="h-full w-full"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}