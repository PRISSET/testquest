'use client';

import NumberFlow from '@number-flow/react';
import { motion } from 'framer-motion';
import { useMemo, useState, useTransition } from 'react';

import { loadChartAction } from '@/app/actions';
import { InteractiveChart } from '@/components/ui/interactive-chart';
import { MotionButton } from '@/components/ui/motion-button';
import { formatDateLabel } from '@/lib/format';
import { type ChartPoint, type ChartSeries, timeRanges, type TimeRange } from '@/lib/types';

const valueFormat = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
};

const tabLabel: Record<TimeRange, string> = {
  '1H': '1H',
  '6H': '6H',
  '1D': '1D',
  '1W': '1W',
  '1M': '1M',
  ALL: 'All'
};

function rangeLabel(range: TimeRange): string {
  switch (range) {
    case '1H':
      return 'Past Hour';
    case '6H':
      return 'Past Day';
    case '1D':
      return 'Past Day';
    case '1W':
      return 'Past Week';
    case '1M':
      return 'Past Month';
    case 'ALL':
      return 'All Time';
  }
}

export function PnlCard({
  publicKey,
  initialChart
}: {
  publicKey: `0x${string}`;
  initialChart: ChartSeries;
}) {
  const [chart, setChart] = useState(initialChart);
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);
  const [pending, startTransition] = useTransition();

  const shownChange = useMemo(() => {
    if (!hoveredPoint) {
      return chart.changeUsd;
    }

    return hoveredPoint.valueUsd - chart.startValueUsd;
  }, [chart.changeUsd, chart.startValueUsd, hoveredPoint]);

  const isPositive = shownChange >= 0;

  return (
    <motion.article
      className="panel pnl-panel"
      layout
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05, layout: { duration: 0.28, ease: 'easeInOut' } }}
    >
      <header className="pnl-head">
        <div className="pnl-title-row">
          <div className="pnl-title-with-icon">
            <img
              src="/figma/2010_137.svg"
              width={16}
              height={16}
              alt=""
              className={isPositive ? 'pnl-trend-icon' : 'pnl-trend-icon pnl-trend-icon-negative'}
            />
            <span>Profit/Loss</span>
            <img src="/figma/2010_139.svg" width={16} height={16} alt="" className="pnl-share-icon" />
          </div>

          <div className="range-tabs">
            {timeRanges.map((range) => (
              <MotionButton
                key={range}
                variant="ghost"
                className={`range-tab${range === chart.range ? ' active' : ''}`}
                disabled={pending}
                onClick={() => {
                  if (range === chart.range) {
                    return;
                  }

                  startTransition(async () => {
                    const result = await loadChartAction(publicKey, range);
                    setHoveredPoint(null);
                    setChart(result);
                  });
                }}
              >
                {tabLabel[range]}
              </MotionButton>
            ))}
          </div>
        </div>

        <div className="pnl-value-wrap">
          <h3 className={isPositive ? 'pnl-value-positive' : 'pnl-value-negative'}>
            {isPositive ? '+' : '-'}$
            <NumberFlow value={Math.abs(shownChange)} format={valueFormat} className="numberflow" />
          </h3>
          <p>{hoveredPoint ? formatDateLabel(hoveredPoint.timestamp) : rangeLabel(chart.range)}</p>
        </div>
      </header>

      <img src="/figma/2010_157.svg" width={30} height={20} alt="" className="pnl-watermark" />

      <InteractiveChart
        points={chart.points}
        onHover={(point) => {
          setHoveredPoint(point);
        }}
      />
    </motion.article>
  );
}
