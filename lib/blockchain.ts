import { getConfig } from '@/lib/config.server';
import { erc20Abi } from '@/lib/erc20';
import {
  type Address,
  type Hex,
  createPublicClient,
  createWalletClient,
  defineChain,
  formatUnits,
  http,
  parseUnits
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

let clients:
  | {
      publicClient: ReturnType<typeof createPublicClient>;
      walletClient: ReturnType<typeof createWalletClient>;
      account: ReturnType<typeof privateKeyToAccount>;
    }
  | undefined;

function getClients() {
  if (clients) {
    return clients;
  }

  const env = getConfig();
  const chain = defineChain({
    id: env.chainId,
    name: `Chain-${env.chainId}`,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: {
      default: {
        http: [env.rpcUrl]
      }
    }
  });

  const account = privateKeyToAccount(env.walletPrivateKey as Hex);

  clients = {
    account,
    publicClient: createPublicClient({
      chain,
      transport: http(env.rpcUrl)
    }),
    walletClient: createWalletClient({
      account,
      chain,
      transport: http(env.rpcUrl)
    })
  };

  return clients;
}

export function toTokenUnits(raw: bigint): number {
  const env = getConfig();
  return Number(formatUnits(raw, env.tokenDecimals));
}

export function parseTokenAmount(amount: string): bigint {
  const env = getConfig();
  return parseUnits(amount, env.tokenDecimals);
}

export async function transferToken(to: Address, amount: string): Promise<`0x${string}`> {
  const env = getConfig();
  const { account, publicClient, walletClient } = getClients();
  const parsedAmount = parseTokenAmount(amount);

  if (parsedAmount <= 0n) {
    throw new Error('Amount should be greater than zero');
  }

  const { request } = await publicClient.simulateContract({
    account,
    address: env.tokenAddress,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [to, parsedAmount]
  });

  const txHash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return txHash;
}
