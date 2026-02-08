import type { ChartPoint, ChartSeries, DashboardData, TimeRange } from '@/lib/types';

const fallbackPublicKey = '0x1111111111111111111111111111111111111111' as const;
const fallbackTokenAddress = '0x2222222222222222222222222222222222222222' as const;
const mockCurrentValueUsd = 3361.42;

const rangeChangeUsd: Record<TimeRange, number> = {
  '1H': 42.37,
  '6H': 223.43,
  '1D': 223.43,
  '1W': 488.62,
  '1M': 792.11,
  'ALL': 1249.85
};

interface FallbackOverrides {
  walletName?: string;
  joinedAt?: string;
  tokenSymbol?: string;
  tokenAddress?: `0x${string}`;
  tokenDecimals?: number;
  publicKey?: `0x${string}`;
}

function rangeMs(range: TimeRange): number {
  switch (range) {
    case '1H':
      return 60 * 60 * 1000;
    case '6H':
      return 6 * 60 * 60 * 1000;
    case '1D':
      return 24 * 60 * 60 * 1000;
    case '1W':
      return 7 * 24 * 60 * 60 * 1000;
    case '1M':
      return 30 * 24 * 60 * 60 * 1000;
    case 'ALL':
      return 120 * 24 * 60 * 60 * 1000;
  }
}

function rangeCount(range: TimeRange): number {
  switch (range) {
    case '1H':
      return 16;
    case '6H':
      return 24;
    case '1D':
      return 24;
    case '1W':
      return 30;
    case '1M':
      return 34;
    case 'ALL':
      return 36;
  }
}

export function buildFallbackChart(range: TimeRange): ChartSeries {
  const now = Date.now();
  const duration = rangeMs(range);
  const count = rangeCount(range);
  const step = duration / Math.max(count - 1, 1);
  const currentValueUsd = mockCurrentValueUsd;
  const changeUsdTarget = rangeChangeUsd[range];
  const startValueUsd = Math.max(currentValueUsd - changeUsdTarget, 1);
  const amplitude = Math.max(changeUsdTarget * 0.42, 32);
  const points: ChartPoint[] = [];

  for (let i = 0; i < count; i += 1) {
    const timestamp = Math.round(now - duration + i * step);
    const progress = i / Math.max(count - 1, 1);
    const trend = startValueUsd + (currentValueUsd - startValueUsd) * progress;
    const wave =
      Math.sin(i * 0.38 + 0.9) * amplitude * 0.35 +
      Math.cos(i * 0.22) * amplitude * 0.2 +
      Math.sin(i * 0.77) * amplitude * 0.12;

    points.push({
      timestamp,
      valueUsd: Math.max(trend + wave, 0)
    });
  }

  if (points.length) {
    points[0] = { ...points[0], valueUsd: startValueUsd };
    points[points.length - 1] = { ...points[points.length - 1], valueUsd: currentValueUsd };
  }

  const changeUsd = currentValueUsd - startValueUsd;
  const changePercent = (changeUsd / startValueUsd) * 100;

  return {
    range,
    points,
    startValueUsd,
    currentValueUsd,
    changeUsd,
    changePercent
  };
}

export function buildFallbackDashboard(
  range: TimeRange,
  overrides: FallbackOverrides = {}
): DashboardData {
  const chart = buildFallbackChart(range);

  return {
    metrics: {
      walletName: overrides.walletName ?? 'My Wallet',
      joinedAt: overrides.joinedAt ?? '2025-11-01',
      publicKey: overrides.publicKey ?? fallbackPublicKey,
      tokenSymbol: overrides.tokenSymbol ?? 'USDC',
      tokenAddress: overrides.tokenAddress ?? fallbackTokenAddress,
      tokenDecimals: overrides.tokenDecimals ?? 6,
      balance: 984.42,
      balanceUsd: mockCurrentValueUsd,
      portfolioValueUsd: mockCurrentValueUsd,
      tokenPlusPortfolioUsd: 0.01,
      pnlTodayUsd: 23.43,
      pnlTodayPercent: 5.2
    },
    chart
  };
}
