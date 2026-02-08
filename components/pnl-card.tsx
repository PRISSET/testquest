'use client';

import NumberFlow from '@number-flow/react';
import { motion } from 'framer-motion';
import { TrendingUp, Upload } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';

import { loadChartAction } from '@/app/actions';
import { InteractiveChart } from '@/components/ui/interactive-chart';
import { MotionButton } from '@/components/ui/motion-button';
import { formatDateLabel } from '@/lib/format';
import { type ChartPoint, type ChartSeries, timeRanges, type TimeRange } from '@/lib/types';

function rangeLabel(range: TimeRange): string {
  switch (range) {
    case '1H':
      return 'Past hour';
    case '6H':
      return 'Past 6 hours';
    case '1D':
      return 'Past day';
    case '1W':
      return 'Past week';
    case '1M':
      return 'Past month';
    case 'ALL':
      return 'All time';
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
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
    >
      <header className="pnl-head">
        <div className="pnl-title-row">
          <div className="pnl-title-with-icon">
            <TrendingUp size={15} className={isPositive ? 'icon-positive' : 'icon-negative'} />
            <span>Profit/Loss</span>
            <Upload size={13} />
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
                {range}
              </MotionButton>
            ))}
          </div>
        </div>

        <div>
          <h3 className={isPositive ? 'positive' : 'negative'}>
            {isPositive ? '+' : '-'}$
            <NumberFlow value={Math.abs(shownChange)} className="numberflow" />
          </h3>
          <p>{hoveredPoint ? formatDateLabel(hoveredPoint.timestamp) : rangeLabel(chart.range)}</p>
        </div>
      </header>

      <InteractiveChart
        points={chart.points}
        onHover={(point) => {
          setHoveredPoint(point);
        }}
      />
    </motion.article>
  );
}
