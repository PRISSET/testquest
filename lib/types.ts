export const timeRanges = ['1H', '6H', '1D', '1W', '1M', 'ALL'] as const;

export type TimeRange = (typeof timeRanges)[number];

export interface ChartPoint {
  timestamp: number;
  valueUsd: number;
}

export interface ChartSeries {
  range: TimeRange;
  points: ChartPoint[];
  startValueUsd: number;
  currentValueUsd: number;
  changeUsd: number;
  changePercent: number;
}

export interface WalletMetrics {
  walletName: string;
  joinedAt: string;
  publicKey: `0x${string}`;
  tokenSymbol: string;
  tokenAddress: `0x${string}`;
  tokenDecimals: number;
  balance: number;
  balanceUsd: number;
  portfolioValueUsd: number;
  tokenPlusPortfolioUsd: number;
  pnlTodayUsd: number;
  pnlTodayPercent: number;
}

export interface DashboardData {
  metrics: WalletMetrics;
  chart: ChartSeries;
}

export interface ActionResult {
  success: boolean;
  message: string;
  txHash?: `0x${string}`;
}
