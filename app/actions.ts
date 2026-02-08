'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { isAddress, type Address } from 'viem';

import { transferToken } from '@/lib/blockchain';
import { getConfig, getConfigStatus } from '@/lib/config.server';
import { buildFallbackChart, buildFallbackDashboard } from '@/lib/fallback-data';
import { getChartData, getDashboardData } from '@/lib/portfolio';
import { type ActionResult, timeRanges } from '@/lib/types';

const chartRequestSchema = z.object({
  publicKey: z.string(),
  range: z.enum(timeRanges)
});

const amountSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d+)?$/, 'Amount should be a valid number')
    .refine((value) => Number(value) > 0, 'Amount should be greater than zero')
});

const withdrawSchema = amountSchema.extend({
  to: z.string().trim().optional()
});

export async function loadDashboardAction(range: (typeof timeRanges)[number] = '6H') {
  const status = getConfigStatus();
  if (!status.isReady) {
    return buildFallbackDashboard(range);
  }

  const config = getConfig();
  return getDashboardData(config.trackedPublicKey, range);
}

export async function loadChartAction(publicKey: string, range: (typeof timeRanges)[number]) {
  const status = getConfigStatus();
  if (!status.isReady) {
    return buildFallbackChart(range);
  }

  const parsed = chartRequestSchema.parse({ publicKey, range });

  if (!isAddress(parsed.publicKey)) {
    throw new Error('Invalid public key');
  }

  return getChartData(parsed.publicKey as Address, parsed.range);
}

export async function depositTokenAction(payload: { amount: string }): Promise<ActionResult> {
  try {
    const status = getConfigStatus();
    if (!status.isReady) {
      return {
        success: false,
        message: `Set .env first. Missing keys: ${status.missingKeys.join(', ')}`
      };
    }

    const config = getConfig();
    const parsed = amountSchema.parse(payload);
    const txHash = await transferToken(config.vaultPublicKey, parsed.amount);

    revalidatePath('/');

    return {
      success: true,
      message: 'Deposit sent successfully',
      txHash
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Deposit failed'
    };
  }
}

export async function withdrawTokenAction(payload: {
  amount: string;
  to?: string;
}): Promise<ActionResult> {
  try {
    const status = getConfigStatus();
    if (!status.isReady) {
      return {
        success: false,
        message: `Set .env first. Missing keys: ${status.missingKeys.join(', ')}`
      };
    }

    const config = getConfig();
    const parsed = withdrawSchema.parse(payload);
    const destination = parsed.to?.length
      ? parsed.to
      : config.defaultWithdrawAddress ?? config.trackedPublicKey;

    if (!isAddress(destination)) {
      throw new Error('Invalid withdraw address');
    }

    const txHash = await transferToken(destination as Address, parsed.amount);

    revalidatePath('/');

    return {
      success: true,
      message: 'Withdraw sent successfully',
      txHash
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Withdraw failed'
    };
  }
}
