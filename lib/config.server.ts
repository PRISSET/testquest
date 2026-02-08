const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const PRIVATE_KEY_RE = /^0x[a-fA-F0-9]{64}$/;

export interface AppConfig {
  walletName: string;
  trackedPublicKey: `0x${string}`;
  walletPrivateKey: `0x${string}`;
  vaultPublicKey: `0x${string}`;
  defaultWithdrawAddress?: `0x${string}`;
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
  tokenDecimals: number;
  chainId: number;
  rpcUrl: string;
  etherscanBaseUrl: string;
  etherscanApiKey: string;
  fallbackTokenUsdPrice: number;
  joinedAt: string;
}

export interface ConfigStatus {
  isReady: boolean;
  missingKeys: string[];
}

let cachedConfig: AppConfig | null = null;
const requiredKeys = [
  'TRACKED_PUBLIC_KEY',
  'WALLET_PRIVATE_KEY',
  'VAULT_PUBLIC_KEY',
  'TOKEN_ADDRESS',
  'RPC_URL',
  'ETHERSCAN_API_KEY'
] as const;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function parseAddress(name: string, value: string): `0x${string}` {
  if (!ADDRESS_RE.test(value)) {
    throw new Error(`Invalid address in env: ${name}`);
  }
  return value as `0x${string}`;
}

function parsePrivateKey(name: string, value: string): `0x${string}` {
  if (!PRIVATE_KEY_RE.test(value)) {
    throw new Error(`Invalid private key in env: ${name}`);
  }
  return value as `0x${string}`;
}

function parsePositiveInt(name: string, value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid positive integer in env: ${name}`);
  }
  return parsed;
}

function parsePositiveNumber(name: string, value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid positive number in env: ${name}`);
  }
  return parsed;
}

export function getConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const defaultWithdraw = process.env.DEFAULT_WITHDRAW_ADDRESS;

  cachedConfig = {
    walletName: process.env.WALLET_NAME ?? 'My Wallet',
    trackedPublicKey: parseAddress('TRACKED_PUBLIC_KEY', required('TRACKED_PUBLIC_KEY')),
    walletPrivateKey: parsePrivateKey('WALLET_PRIVATE_KEY', required('WALLET_PRIVATE_KEY')),
    vaultPublicKey: parseAddress('VAULT_PUBLIC_KEY', required('VAULT_PUBLIC_KEY')),
    defaultWithdrawAddress: defaultWithdraw
      ? parseAddress('DEFAULT_WITHDRAW_ADDRESS', defaultWithdraw)
      : undefined,
    tokenAddress: parseAddress('TOKEN_ADDRESS', required('TOKEN_ADDRESS')),
    tokenSymbol: process.env.TOKEN_SYMBOL ?? 'TOKEN',
    tokenDecimals: parsePositiveInt('TOKEN_DECIMALS', process.env.TOKEN_DECIMALS, 18),
    chainId: parsePositiveInt('CHAIN_ID', process.env.CHAIN_ID, 1),
    rpcUrl: required('RPC_URL'),
    etherscanBaseUrl: process.env.ETHERSCAN_BASE_URL ?? 'https://api.etherscan.io/api',
    etherscanApiKey: required('ETHERSCAN_API_KEY'),
    fallbackTokenUsdPrice: parsePositiveNumber(
      'FALLBACK_TOKEN_USD_PRICE',
      process.env.FALLBACK_TOKEN_USD_PRICE,
      1
    ),
    joinedAt: process.env.JOINED_AT ?? '2025-11-01'
  };

  return cachedConfig;
}

export function getConfigStatus(): ConfigStatus {
  const missingKeys = requiredKeys.filter((key) => !process.env[key]);
  return {
    isReady: missingKeys.length === 0,
    missingKeys
  };
}
