'use client';

import { useMemo, useState } from 'react';

import type { ChartPoint } from '@/lib/types';

interface InteractiveChartProps {
  points: ChartPoint[];
  onHover: (point: ChartPoint | null) => void;
}

interface NormalizedPoint {
  x: number;
  y: number;
  source: ChartPoint;
}

const CHART_WIDTH = 599;
const CHART_HEIGHT = 88;
const BASELINE = 87.5;
const LINE_TOP = 18;
const LINE_BOTTOM = 56;

function buildSmoothPath(points: NormalizedPoint[]): string {
  if (!points.length) {
    return '';
  }

  if (points.length === 1) {
    return `M ${points[0].x.toFixed(3)} ${points[0].y.toFixed(3)}`;
  }

  let path = `M ${points[0].x.toFixed(3)} ${points[0].y.toFixed(3)}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(3)} ${cp1y.toFixed(3)} ${cp2x.toFixed(3)} ${cp2y.toFixed(3)} ${p2.x.toFixed(3)} ${p2.y.toFixed(3)}`;
  }

  return path;
}

export function InteractiveChart({ points, onHover }: InteractiveChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const normalizedPoints = useMemo<NormalizedPoint[]>(() => {
    if (!points.length) {
      return [];
    }

    const values = points.map((point) => point.valueUsd);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(max - min, 1);

    return points.map((point, index) => {
      const x = points.length > 1 ? (index / (points.length - 1)) * CHART_WIDTH : 0;
      const ratio = (point.valueUsd - min) / span;
      const y = LINE_BOTTOM - ratio * (LINE_BOTTOM - LINE_TOP);

      return {
        x,
        y,
        source: point
      };
    });
  }, [points]);

  const linePath = useMemo(() => buildSmoothPath(normalizedPoints), [normalizedPoints]);

  const areaPath = useMemo(() => {
    if (!linePath || !normalizedPoints.length) {
      return '';
    }

    const first = normalizedPoints[0];
    const last = normalizedPoints[normalizedPoints.length - 1];

    return `${linePath} L ${last.x.toFixed(3)} ${BASELINE.toFixed(3)} L ${first.x.toFixed(3)} ${BASELINE.toFixed(3)} Z`;
  }, [linePath, normalizedPoints]);

  const activePoint = activeIndex === null ? null : normalizedPoints[activeIndex] ?? null;

  return (
    <div
      className="chart-wrap"
      onMouseLeave={() => {
        setActiveIndex(null);
        onHover(null);
      }}
      onMouseMove={(event) => {
        if (!normalizedPoints.length) {
          return;
        }

        const bounds = event.currentTarget.getBoundingClientRect();
        const xRatio = (event.clientX - bounds.left) / bounds.width;
        const clamped = Math.min(Math.max(xRatio, 0), 1);
        const index = Math.round(clamped * (normalizedPoints.length - 1));

        setActiveIndex(index);
        onHover(normalizedPoints[index].source);
      }}
    >
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        className="chart-svg"
        role="img"
        aria-label="PnL chart"
      >
        <defs>
          <linearGradient id="pnl-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff5100" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#ff5100" stopOpacity="0" />
          </linearGradient>
        </defs>

        {areaPath ? <path d={areaPath} fill="url(#pnl-fill)" /> : null}
        {linePath ? (
          <path
            d={linePath}
            fill="none"
            stroke="#ff5100"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
          />
        ) : null}

        {activePoint ? (
          <>
            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={0}
              y2={BASELINE}
              stroke="#ff8f52"
              strokeDasharray="2 4"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={activePoint.x} cy={activePoint.y} r="3" fill="#ff5100" />
          </>
        ) : null}
      </svg>
    </div>
  );
}
