import { getConfig } from '@/lib/config.server';

interface DexScreenerResponse {
  pairs?: Array<{
    priceUsd?: string;
    liquidity?: {
      usd?: number;
    };
  }>;
}

export async function fetchTokenUsdPrice(): Promise<number> {
  const env = getConfig();
  const url = `https://api.dexscreener.com/latest/dex/tokens/${env.tokenAddress}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      return env.fallbackTokenUsdPrice;
    }

    const json = (await response.json()) as DexScreenerResponse;
    const pairs = json.pairs ?? [];

    if (!pairs.length) {
      return env.fallbackTokenUsdPrice;
    }

    const bestPair = pairs
      .filter((pair) => pair.priceUsd)
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];

    const price = Number(bestPair?.priceUsd ?? env.fallbackTokenUsdPrice);

    return Number.isFinite(price) && price > 0 ? price : env.fallbackTokenUsdPrice;
  } catch {
    return env.fallbackTokenUsdPrice;
  }
}
