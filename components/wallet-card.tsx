'use client';

import NumberFlow from '@number-flow/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownToLine, ArrowUpFromLine, Pencil, WalletMinimal } from 'lucide-react';
import { useState, useTransition } from 'react';

import { depositTokenAction, withdrawTokenAction } from '@/app/actions';
import { MotionButton } from '@/components/ui/motion-button';
import type { ActionResult, WalletMetrics } from '@/lib/types';

function shortenHash(hash: string): string {
  if (hash.length <= 14) {
    return hash;
  }

  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
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

  return (
    <motion.article
      className="panel wallet-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <header className="wallet-head">
        <div className="wallet-identity">
          <div className="wallet-icon-circle">
            <WalletMinimal size={17} strokeWidth={1.8} />
          </div>
          <div>
            <div className="wallet-title-row">
              <h2>{metrics.walletName}</h2>
              <Pencil size={14} strokeWidth={1.7} />
            </div>
            <p>Joined {new Date(metrics.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="wallet-head-stats">
          <div>
            <span>Portfolio ( Not USDC )</span>
            <strong>
              $<NumberFlow value={metrics.portfolioValueUsd} className="numberflow" />
            </strong>
          </div>
          <div className="divider" />
          <div>
            <span>{metrics.tokenSymbol} + Portfolio</span>
            <strong>
              $<NumberFlow value={metrics.tokenPlusPortfolioUsd} className="numberflow" />
            </strong>
          </div>
        </div>
      </header>

      <div className="wallet-balance-row">
        <h3>
          <NumberFlow value={metrics.balance} className="numberflow" /> {metrics.tokenSymbol}
        </h3>
        <p className={isPositive ? 'positive' : 'negative'}>
          {isPositive ? '+' : '-'}$
          <NumberFlow value={Math.abs(metrics.pnlTodayUsd)} className="numberflow" />
          <span className="delta-sep">•</span>
          {isPositive ? '▲' : '▼'}
          <NumberFlow value={Math.abs(metrics.pnlTodayPercent)} className="numberflow" />% Today
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
          <ArrowDownToLine size={16} />
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
          <ArrowUpFromLine size={16} />
          Withdraw
        </MotionButton>
      </div>

      <AnimatePresence>
        {mode ? (
          <motion.form
            className="wallet-inline-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
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
              Amount ({metrics.tokenSymbol})
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
            ) : null}

            <MotionButton variant="ghost" type="submit" disabled={pending}>
              {pending ? 'Sending...' : mode === 'deposit' ? 'Confirm deposit' : 'Confirm withdraw'}
            </MotionButton>
          </motion.form>
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
