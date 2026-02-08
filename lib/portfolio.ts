import { unstable_cache } from 'next/cache';
import { type Address, formatUnits } from 'viem';

import { toTokenUnits } from '@/lib/blockchain';
import { getConfig } from '@/lib/config.server';
import { fetchTokenBalance, fetchTokenTransfers } from '@/lib/etherscan';
import { buildFallbackChart, buildFallbackDashboard } from '@/lib/fallback-data';
import { fetchTokenUsdPrice } from '@/lib/price';
import type { ChartPoint, ChartSeries, DashboardData, TimeRange } from '@/lib/types';

interface RangeConfig {
  milliseconds: number;
  points: number;
}

const rangeConfig: Record<Exclude<TimeRange, 'ALL'>, RangeConfig> = {
  '1H': { milliseconds: 60 * 60 * 1000, points: 16 },
  '6H': { milliseconds: 6 * 60 * 60 * 1000, points: 24 },
  '1D': { milliseconds: 24 * 60 * 60 * 1000, points: 24 },
  '1W': { milliseconds: 7 * 24 * 60 * 60 * 1000, points: 28 },
  '1M': { milliseconds: 30 * 24 * 60 * 60 * 1000, points: 30 }
};

const getCachedBalanceRaw = unstable_cache(
  async (publicKey: Address) => {
    const balanceRaw = await fetchTokenBalance(publicKey);
    return balanceRaw.toString();
  },
  ['wallet-balance'],
  { revalidate: 60 }
);

const getCachedTransfers = unstable_cache(
  async (publicKey: Address) => {
    return fetchTokenTransfers(publicKey);
  },
  ['wallet-transfers'],
  { revalidate: 60 }
);

const getCachedTokenPrice = unstable_cache(
  async () => {
    return fetchTokenUsdPrice();
  },
  ['token-price'],
  { revalidate: 60 }
);

const getCachedChartSeries = unstable_cache(
  async (publicKey: Address, range: TimeRange): Promise<ChartSeries> => {
    const env = getConfig();
    const [balanceRawString, transfers, tokenPrice] = await Promise.all([
      getCachedBalanceRaw(publicKey),
      getCachedTransfers(publicKey),
      getCachedTokenPrice()
    ]);

    const currentBalance = Number(formatUnits(BigInt(balanceRawString), env.tokenDecimals));
    const currentValueUsd = currentBalance * tokenPrice;

    const points = buildChartPoints({
      publicKey,
      range,
      currentBalance,
      currentValueUsd,
      tokenPrice,
      transfers
    });

    const startValueUsd = points[0]?.valueUsd ?? currentValueUsd;
    const changeUsd = currentValueUsd - startValueUsd;
    const changePercent =
      Math.abs(startValueUsd) < Number.EPSILON ? 0 : (changeUsd / startValueUsd) * 100;

    return {
      range,
      points,
      startValueUsd,
      currentValueUsd,
      changeUsd,
      changePercent
    };
  },
  ['chart-series'],
  { revalidate: 60 }
);

function resolveChartTimeline(range: TimeRange, transfers: Array<{ timestamp: number }>) {
  const now = Date.now();

  if (range === 'ALL') {
    const oldestTxTimestamp = transfers[0]?.timestamp;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    const start = oldestTxTimestamp ? Math.min(oldestTxTimestamp, monthAgo) : monthAgo;

    return {
      start,
      end: now,
      points: 32
    };
  }

  const config = rangeConfig[range];
  return {
    start: now - config.milliseconds,
    end: now,
    points: config.points
  };
}

function buildTimestamps(range: TimeRange, transfers: Array<{ timestamp: number }>): number[] {
  const { start, end, points } = resolveChartTimeline(range, transfers);

  if (points <= 1) {
    return [end];
  }

  const step = (end - start) / (points - 1);
  const timestamps: number[] = [];

  for (let i = 0; i < points; i += 1) {
    timestamps.push(Math.round(start + step * i));
  }

  return timestamps;
}

function buildChartPoints({
  publicKey,
  range,
  currentBalance,
  currentValueUsd,
  tokenPrice,
  transfers
}: {
  publicKey: Address;
  range: TimeRange;
  currentBalance: number;
  currentValueUsd: number;
  tokenPrice: number;
  transfers: Awaited<ReturnType<typeof fetchTokenTransfers>>;
}): ChartPoint[] {
  const timeline = buildTimestamps(range, transfers);
  const normalizedPublicKey = publicKey.toLowerCase();

  const transferFlows = transfers.map((tx) => {
    const tokens = toTokenUnits(tx.valueRaw);
    const isInflow = tx.to === normalizedPublicKey;
    const isOutflow = tx.from === normalizedPublicKey;
    const signedFlow = isInflow ? tokens : isOutflow ? -tokens : 0;

    return {
      timestamp: tx.timestamp,
      flowTokens: signedFlow
    };
  });

  let cursor = transferFlows.length - 1;
  let futureFlow = 0;

  const points = timeline.map((timestamp) => {
    while (cursor >= 0 && transferFlows[cursor].timestamp > timestamp) {
      futureFlow += transferFlows[cursor].flowTokens;
      cursor -= 1;
    }

    const historicalBalance = Math.max(currentBalance - futureFlow, 0);
    return {
      timestamp,
      valueUsd: historicalBalance * tokenPrice
    };
  });

  const variance =
    Math.max(...points.map((point) => point.valueUsd)) - Math.min(...points.map((point) => point.valueUsd));

  const flatThreshold = Math.max(currentValueUsd * 0.002, 0.0001);

  if (variance <= flatThreshold) {
    return applySyntheticWaves(points, currentValueUsd);
  }

  points[points.length - 1] = {
    ...points[points.length - 1],
    valueUsd: currentValueUsd
  };

  return points;
}

function applySyntheticWaves(points: ChartPoint[], anchorValue: number): ChartPoint[] {
  if (!points.length) {
    return [];
  }

  const amplitude = Math.max(anchorValue * 0.028, 1);
  const output = points.map((point, index) => {
    const wave =
      Math.sin(index * 0.45 + 1.2) * amplitude +
      Math.cos(index * 0.21 + 0.4) * amplitude * 0.45 +
      Math.sin(index * 0.9) * amplitude * 0.2;

    return {
      timestamp: point.timestamp,
      valueUsd: Math.max(anchorValue + wave, 0)
    };
  });

  output[0] = {
    ...output[0],
    valueUsd: Math.max(anchorValue - amplitude * 0.6, 0)
  };

  output[output.length - 1] = {
    ...output[output.length - 1],
    valueUsd: anchorValue
  };

  return output;
}

export async function getDashboardData(
  publicKey?: Address,
  range: TimeRange = '6H'
): Promise<DashboardData> {
  const env = getConfig();
  const resolvedPublicKey = publicKey ?? env.trackedPublicKey;

  const [balanceRawString, tokenPrice, chart1D, chartRequested] = await Promise.all([
    getCachedBalanceRaw(resolvedPublicKey),
    getCachedTokenPrice(),
    getCachedChartSeries(resolvedPublicKey, '1D'),
    getCachedChartSeries(resolvedPublicKey, range)
  ]);

  const balance = Number(formatUnits(BigInt(balanceRawString), env.tokenDecimals));
  const balanceUsd = balance * tokenPrice;
  const noLiveData =
    balance <= Number.EPSILON &&
    balanceUsd <= Number.EPSILON &&
    chartRequested.currentValueUsd <= Number.EPSILON &&
    chart1D.currentValueUsd <= Number.EPSILON;

  if (noLiveData) {
    return buildFallbackDashboard(range, {
      walletName: env.walletName,
      joinedAt: env.joinedAt,
      tokenSymbol: env.tokenSymbol,
      tokenAddress: env.tokenAddress,
      tokenDecimals: env.tokenDecimals,
      publicKey: resolvedPublicKey
    });
  }

  return {
    metrics: {
      walletName: env.walletName,
      joinedAt: env.joinedAt,
      publicKey: resolvedPublicKey,
      tokenSymbol: env.tokenSymbol,
      tokenAddress: env.tokenAddress,
      tokenDecimals: env.tokenDecimals,
      balance,
      balanceUsd,
      portfolioValueUsd: balanceUsd,
      tokenPlusPortfolioUsd: balanceUsd,
      pnlTodayUsd: chart1D.changeUsd,
      pnlTodayPercent: chart1D.changePercent
    },
    chart: chartRequested
  };
}

export async function getChartData(
  publicKey?: Address,
  range: TimeRange = '6H'
): Promise<ChartSeries> {
  const env = getConfig();
  const resolvedPublicKey = publicKey ?? env.trackedPublicKey;
  const series = await getCachedChartSeries(resolvedPublicKey, range);

  const noLiveData =
    series.currentValueUsd <= Number.EPSILON && Math.abs(series.changeUsd) <= Number.EPSILON;

  if (noLiveData) {
    return buildFallbackChart(range);
  }

  return series;
}
