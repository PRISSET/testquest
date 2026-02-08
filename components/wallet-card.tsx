'use client';

import NumberFlow from '@number-flow/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useTransition } from 'react';

import { depositTokenAction, withdrawTokenAction } from '@/app/actions';
import { MotionButton } from '@/components/ui/motion-button';
import type { ActionResult, WalletMetrics } from '@/lib/types';

const usMoneyFormat = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
};

const commaMoneyNoGrouping = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false
};

const percentFormat = {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  useGrouping: false
};

function shortenHash(hash: string): string {
  if (hash.length <= 14) {
    return hash;
  }

  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function joinedLabel(joinedAt: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric'
  }).format(new Date(joinedAt));
}

function displayTokenSymbol(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized || normalized === 'TOKEN') {
    return 'USDC';
  }
  return normalized;
}

export function WalletCard({
  metrics
}: {
  metrics: WalletMetrics;
}) {
  const [mode, setMode] = useState<'deposit' | 'withdraw' | null>(null);
  const [amount, setAmount] = useState('10');
  const [to, setTo] = useState<string>(metrics.publicKey);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const isPositive = metrics.pnlTodayUsd >= 0;
  const tokenSymbol = displayTokenSymbol(metrics.tokenSymbol);

  return (
    <motion.article
      className="panel wallet-panel"
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', layout: { duration: 0.28, ease: 'easeInOut' } }}
    >
      <header className="wallet-head">
        <div className="wallet-identity">
          <div className="wallet-icon-circle" aria-hidden="true">
            <img src="/figma/2010_67.svg" width={16} height={16} alt="" />
          </div>

          <div className="wallet-title-wrap">
            <div className="wallet-title-row">
              <h2>{metrics.walletName}</h2>
              <img src="/figma/2010_74.svg" width={14} height={14} alt="" className="wallet-edit-icon" />
            </div>
            <p>Joined {joinedLabel(metrics.joinedAt)}</p>
          </div>
        </div>

        <div className="wallet-head-stats">
          <div className="wallet-stat-block">
            <span>Portfolio ( Not USDC )</span>
            <strong>
              $<NumberFlow value={metrics.portfolioValueUsd} format={usMoneyFormat} className="numberflow" />
            </strong>
          </div>

          <span className="wallet-head-divider" aria-hidden="true" />

          <div className="wallet-stat-block wallet-stat-block-token">
            <span>{tokenSymbol} + Portfolio</span>
            <strong className="wallet-token-total">
              <img src="/figma/2010_94.svg" width={24} height={24} alt="" />
              $
              <NumberFlow
                value={metrics.tokenPlusPortfolioUsd}
                locales="de-DE"
                format={commaMoneyNoGrouping}
                className="numberflow"
              />
            </strong>
          </div>
        </div>
      </header>

      <div className="wallet-balance-row">
        <h3>
          <NumberFlow
            value={metrics.balance}
            locales="de-DE"
            format={commaMoneyNoGrouping}
            className="numberflow"
          />{' '}
          {tokenSymbol}
        </h3>

        <p className={isPositive ? 'positive' : 'negative'}>
          {isPositive ? '+' : '-'}$
          <NumberFlow value={Math.abs(metrics.pnlTodayUsd)} format={usMoneyFormat} className="numberflow" />
          <span className="delta-sep">•</span>
          <img
            src="/figma/2010_123.svg"
            width={12}
            height={12}
            alt=""
            className={`wallet-delta-arrow${isPositive ? '' : ' wallet-delta-arrow-negative'}`}
          />
          <NumberFlow value={Math.abs(metrics.pnlTodayPercent)} format={percentFormat} className="numberflow" />%
          <span className="wallet-delta-today">Today</span>
        </p>
      </div>

      <div className="wallet-actions-row">
        <MotionButton
          variant="primary"
          className="wallet-action-main"
          onClick={() => {
            setMode((prev) => (prev === 'deposit' ? null : 'deposit'));
            setResult(null);
          }}
        >
          <img src="/figma/2010_128.svg" width={20} height={20} alt="" />
          Deposit
        </MotionButton>

        <MotionButton
          variant="secondary"
          className="wallet-action-main"
          onClick={() => {
            setMode((prev) => (prev === 'withdraw' ? null : 'withdraw'));
            setResult(null);
          }}
        >
          <img src="/figma/2010_131.svg" width={20} height={20} alt="" />
          Withdraw
        </MotionButton>
      </div>

      <AnimatePresence initial={false}>
        {mode ? (
          <motion.div
            className="wallet-inline-form-shell"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: 'easeInOut' }}
          >
            <motion.form
              className="wallet-inline-form"
              initial={{ y: 8 }}
              animate={{ y: 0 }}
              exit={{ y: 6 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              onSubmit={(event) => {
                event.preventDefault();

                startTransition(async () => {
                  const actionResult =
                    mode === 'deposit'
                      ? await depositTokenAction({ amount })
                      : await withdrawTokenAction({ amount, to });

                  setResult(actionResult);
                });
              }}
            >
              <label>
                Amount ({tokenSymbol})
                <input
                  name="amount"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="10"
                  required
                />
              </label>

              {mode === 'withdraw' ? (
                <label>
                  To address
                  <input
                    name="to"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    placeholder="0x..."
                    required
                  />
                </label>
              ) : (
                <label>
                  Vault
                  <input value="Main vault" readOnly />
                </label>
              )}

              <MotionButton variant="ghost" type="submit" disabled={pending} className="wallet-action-submit">
                {pending ? 'Sending...' : mode === 'deposit' ? 'Confirm deposit' : 'Confirm withdraw'}
              </MotionButton>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {result ? (
        <p className={`wallet-action-status ${result.success ? 'ok' : 'err'}`}>
          {result.message}
          {result.txHash ? ` (${shortenHash(result.txHash)})` : ''}
        </p>
      ) : null}
    </motion.article>
  );
}
