import { getConfig } from '@/lib/config.server';

interface EtherscanEnvelope<T> {
  status: string;
  message: string;
  result: T;
}

interface TokenTransferRaw {
  blockNumber: string;
  timeStamp: string;
  hash: `0x${string}`;
  from: string;
  to: string;
  value: string;
  tokenDecimal: string;
  isError: string;
}

export interface TokenTransfer {
  hash: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  valueRaw: bigint;
  timestamp: number;
}

async function callEtherscan<T>(params: Record<string, string>, fallback: T): Promise<T> {
  const env = getConfig();
  const url = new URL(env.etherscanBaseUrl);
  const searchParams = new URLSearchParams({
    ...params,
    apikey: env.etherscanApiKey
  });

  url.search = searchParams.toString();

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      console.warn(`Etherscan HTTP ${response.status} for action=${params.action ?? 'unknown'}`);
      return fallback;
    }

    const json = (await response.json()) as Partial<EtherscanEnvelope<T>>;
    const status = String(json.status ?? '');
    const message = String(json.message ?? '');
    const result = json.result as T | undefined;

    if (status === '1' && typeof result !== 'undefined') {
      return result;
    }

    if (status === '0') {
      const noData =
        message === 'No transactions found' ||
        (typeof result === 'string' && result === 'No transactions found');
      if (!noData) {
        console.warn(
          `Etherscan NOTOK for action=${params.action ?? 'unknown'}: ${
            typeof result === 'string' ? result : message
          }`
        );
      }
      return fallback;
    }

    return typeof result === 'undefined' ? fallback : result;
  } catch (error) {
    console.warn(
      `Etherscan request failed for action=${params.action ?? 'unknown'}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
    return fallback;
  }
}

export async function fetchTokenBalance(publicKey: `0x${string}`): Promise<bigint> {
  const env = getConfig();
  const result = await callEtherscan<string>(
    {
      module: 'account',
      action: 'tokenbalance',
      contractaddress: env.tokenAddress,
      address: publicKey,
      tag: 'latest'
    },
    '0'
  );

  return BigInt(result || '0');
}

export async function fetchTokenTransfers(publicKey: `0x${string}`): Promise<TokenTransfer[]> {
  const env = getConfig();
  const result = await callEtherscan<TokenTransferRaw[] | string>(
    {
      module: 'account',
      action: 'tokentx',
      contractaddress: env.tokenAddress,
      address: publicKey,
      startblock: '0',
      endblock: '99999999',
      sort: 'asc'
    },
    []
  );

  if (typeof result === 'string') {
    return [];
  }

  return result
    .filter((tx) => tx.isError === '0')
    .map((tx) => ({
      hash: tx.hash,
      from: tx.from.toLowerCase() as `0x${string}`,
      to: tx.to.toLowerCase() as `0x${string}`,
      valueRaw: BigInt(tx.value || '0'),
      timestamp: Number(tx.timeStamp) * 1000
    }));
}
