'use client';

import { useMemo, useState } from 'react';

import type { ChartPoint } from '@/lib/types';

interface InteractiveChartProps {
  points: ChartPoint[];
  onHover: (point: ChartPoint | null, index: number | null) => void;
}

interface NormalizedPoint {
  x: number;
  y: number;
  source: ChartPoint;
}

function buildSmoothPath(points: NormalizedPoint[]): string {
  if (!points.length) {
    return '';
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const cx = (prev.x + curr.x) / 2;

    path += ` Q ${cx} ${prev.y} ${curr.x} ${curr.y}`;
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
      const x = points.length > 1 ? (index / (points.length - 1)) * 100 : 0;
      const y = 90 - ((point.valueUsd - min) / span) * 62;

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

    return `${linePath} L ${last.x} 90 L ${first.x} 90 Z`;
  }, [linePath, normalizedPoints]);

  const activePoint = activeIndex === null ? null : normalizedPoints[activeIndex] ?? null;

  return (
    <div
      className="chart-wrap"
      onMouseLeave={() => {
        setActiveIndex(null);
        onHover(null, null);
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
        onHover(normalizedPoints[index].source, index);
      }}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="chart-svg" role="img" aria-label="PnL chart">
        <defs>
          <linearGradient id="pnl-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff9a5a" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#ff9a5a" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {areaPath ? <path d={areaPath} fill="url(#pnl-fill)" /> : null}
        {linePath ? (
          <path
            d={linePath}
            fill="none"
            stroke="#ff5c00"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
          />
        ) : null}

        {activePoint ? (
          <>
            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={16}
              y2={90}
              stroke="#ffb27f"
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={activePoint.x} cy={activePoint.y} r="1.9" fill="#ff5c00" />
          </>
        ) : null}
      </svg>
    </div>
  );
}
