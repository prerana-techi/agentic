'use client';

import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Shield,
  Coins,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Search,
  Code,
  Flame,
  Send,
} from 'lucide-react';
import {
  AgentQueryResult,
  AgentState,
  QueryTier,
  StepLog,
  TreasuryTransaction,
  X402PaymentChallenge,
} from '@/lib/agent/types';
import {
  SERVICE_TIERS,
  AGENT_WALLET_ADDRESS,
  BASE_SEPOLIA_EXPLORER,
} from '@/lib/x402/protocol';
import { REGISTERED_SUBAGENTS } from '@/lib/agent/tools/subagent-delegator';

const PRESET_QUERIES = [
  {
    label: 'Vault Security Audit',
    query:
      'Audit Base Sepolia vault contracts for reentrancy vectors and transient storage security invariants.',
    tier: 'deep' as QueryTier,
  },
  {
    label: 'DEX Liquidity & MEV',
    query:
      'Synthesize cross-dex liquidity depth, MEV slippage risk, and sentiment velocity on Base Sepolia.',
    tier: 'multi_agent' as QueryTier,
  },
  {
    label: 'Gas & Blob Telemetry',
    query:
      'Fetch live Base Sepolia block state, gas fee trajectory, and EIP-4844 blob settlement metrics.',
    tier: 'quick' as QueryTier,
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<'oracle' | 'treasury' | 'docs'>('oracle');
  const [queryInput, setQueryInput] = useState(PRESET_QUERIES[0].query);
  const [selectedTier, setSelectedTier] = useState<QueryTier>('deep');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);

  // Execution states
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState<X402PaymentChallenge | null>(null);
  const [activeStep, setActiveStep] = useState<string>('');
  const [liveLogs, setLiveLogs] = useState<StepLog[]>([]);
  const [agentResult, setAgentResult] = useState<AgentQueryResult | null>(null);

  // Agent Telemetry State
  const [agentState, setAgentState] = useState<AgentState>({
    name: 'NEXUS-402 Autonomous Oracle',
    version: 'v2.4',
    status: 'IDLE',
    network: 'Base Sepolia',
    chainId: 84532,
    walletAddress: AGENT_WALLET_ADDRESS,
    treasuryBalanceEth: '0.0485',
    treasuryBalanceUsdc: '210.50',
    totalQueriesProcessed: 19,
    totalRevenueEth: '0.0248',
    activeMemoryItemsCount: 5,
    registeredSubagents: 3,
  });

  const [ledger, setLedger] = useState<TreasuryTransaction[]>([]);

  // Fetch telemetry
  const fetchTelemetry = async () => {
    try {
      const res = await fetch('/api/agent/status');
      if (res.ok) {
        const data = await res.json();
        if (data.agent) setAgentState(data.agent);
        if (data.recentTransactions) setLedger(data.recentTransactions);
      }
    } catch (e) {
      console.error('Failed to fetch telemetry', e);
    }
  };

  useEffect(() => {
    let active = true;
    fetch('/api/agent/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (data.agent) setAgentState(data.agent);
        if (data.recentTransactions) setLedger(data.recentTransactions);
      })
      .catch((e) => console.error('Failed to fetch telemetry', e));

    return () => {
      active = false;
    };
  }, []);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(AGENT_WALLET_ADDRESS);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleFaucetRequest = async () => {
    setFaucetLoading(true);
    try {
      const res = await fetch('/api/wallet/faucet', { method: 'POST' });
      if (res.ok) {
        await fetchTelemetry();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFaucetLoading(false);
    }
  };

  // Step 1: Initiate Query -> Receive HTTP 402 challenge
  const handleInitiateQuery = async () => {
    if (!queryInput.trim()) return;
    setIsProcessing(true);
    setAgentResult(null);
    setLiveLogs([]);
    setActiveStep('Requesting HTTP 402 Challenge...');

    try {
      const res = await fetch('/api/x402/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryInput, tier: selectedTier }),
      });

      if (res.status === 402) {
        const challenge: X402PaymentChallenge = await res.json();
        setCurrentChallenge(challenge);
        setActiveStep('HTTP 402 Payment Required: Challenge Received');
      } else {
        const data = await res.json();
        setAgentResult(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 2: Settle Micropayment & Execute Agent Loop
  const handleFulfillPayment = async () => {
    if (!currentChallenge) return;
    setIsProcessing(true);
    setActiveStep('Settling on Base Sepolia...');

    const mockTxHash = `0x${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;

    const paymentProof = {
      txHash: mockTxHash,
      payerAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      invoiceId: currentChallenge.invoiceId,
      simulated: true,
    };

    try {
      const res = await fetch('/api/x402/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-402-Payment-Proof': `txHash=${mockTxHash}; payerAddress=${paymentProof.payerAddress}; invoiceId=${currentChallenge.invoiceId}`,
        },
        body: JSON.stringify({
          query: queryInput,
          tier: selectedTier,
          paymentProof,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const result: AgentQueryResult = json.data;

        if (result && result.stepLogs) {
          for (let i = 0; i < result.stepLogs.length; i++) {
            setActiveStep(result.stepLogs[i].title);
            setLiveLogs(result.stepLogs.slice(0, i + 1));
            await new Promise((r) => setTimeout(r, 400));
          }
        }

        setAgentResult(result);
        setCurrentChallenge(null);
        fetchTelemetry();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setAgentResult(null);
    setCurrentChallenge(null);
    setLiveLogs([]);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(10, 13, 20, 0.85)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          padding: '14px 24px',
        }}
      >
        <div
          style={{
            maxWidth: '1180px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {/* Logo & Network Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0052ff 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Terminal size={18} color="#ffffff" strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#f8fafc' }}>
                  NEXUS<span style={{ color: '#06b6d4' }}>-402</span>
                </span>
                <span className="pill pill-base" style={{ fontSize: '0.7rem' }}>
                  <span className="live-dot" /> Base Sepolia
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setActiveTab('oracle')}
              className={`nav-tab ${activeTab === 'oracle' ? 'active' : ''}`}
            >
              <Search size={15} />
              Oracle
            </button>
            <button
              onClick={() => setActiveTab('treasury')}
              className={`nav-tab ${activeTab === 'treasury' ? 'active' : ''}`}
            >
              <Coins size={15} />
              Treasury
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`nav-tab ${activeTab === 'docs' ? 'active' : ''}`}
            >
              <Code size={15} />
              Developers
            </button>
          </nav>

          {/* Wallet Telemetry & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8rem',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Wallet:</span>
              <code style={{ color: '#e2e8f0', fontSize: '0.8rem' }}>
                {AGENT_WALLET_ADDRESS.slice(0, 6)}...{AGENT_WALLET_ADDRESS.slice(-4)}
              </code>
              <button
                onClick={handleCopyAddress}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copiedAddress ? 'var(--accent-emerald)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                }}
                title="Copy Address"
              >
                {copiedAddress ? <Check size={13} /> : <Copy size={13} />}
              </button>
              <a
                href={`${BASE_SEPOLIA_EXPLORER}/address/${AGENT_WALLET_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                title="View on Basescan"
              >
                <ExternalLink size={13} />
              </a>
            </div>

            <div
              style={{
                background: 'rgba(0, 82, 255, 0.1)',
                border: '1px solid rgba(0, 82, 255, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#60a5fa',
              }}
            >
              {agentState.treasuryBalanceEth} ETH
            </div>

            <button
              onClick={handleFaucetRequest}
              disabled={faucetLoading}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              title="Request Testnet Drop"
            >
              <Flame size={13} color="#f59e0b" />
              {faucetLoading ? 'Dropping...' : 'Faucet'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: '980px', margin: '0 auto', padding: '36px 20px', width: '100%', flex: 1 }}>
        {/* ================= TAB 1: ORACLE ================= */}
        {activeTab === 'oracle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Clean Hero */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <h2
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  color: '#ffffff',
                  marginBottom: '8px',
                }}
              >
                Autonomous On-Chain Intelligence
              </h2>
              <p
                style={{
                  fontSize: '0.95rem',
                  color: 'var(--text-secondary)',
                  maxWidth: '560px',
                  margin: '0 auto',
                  lineHeight: 1.5,
                }}
              >
                Query verified Base Sepolia smart contract invariants, market depth, and network telemetry via the HTTP 402 micropayment standard.
              </p>
            </div>

            {/* Main Query Card */}
            <div className="card-clean" style={{ padding: '24px' }}>
              {/* Query Input Box */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '8px',
                  }}
                >
                  Prompt or Investigation Target
                </label>
                <textarea
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  rows={3}
                  disabled={isProcessing}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: '#ffffff',
                    padding: '14px',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.925rem',
                    lineHeight: 1.5,
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  placeholder="Enter a contract address, invariant check, or on-chain research target..."
                />
              </div>

              {/* Preset suggestion chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Examples:</span>
                {PRESET_QUERIES.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQueryInput(preset.query);
                      setSelectedTier(preset.tier);
                    }}
                    style={{
                      background: queryInput === preset.query ? 'rgba(0, 82, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      border: queryInput === preset.query ? '1px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                      color: queryInput === preset.query ? '#60a5fa' : 'var(--text-secondary)',
                      borderRadius: 'var(--radius-full)',
                      padding: '4px 12px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Micropayment Tier Selector */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '10px',
                  }}
                >
                  Execution Tier
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  {(Object.keys(SERVICE_TIERS) as QueryTier[]).map((tierKey) => {
                    const tier = SERVICE_TIERS[tierKey];
                    const isSelected = selectedTier === tierKey;
                    return (
                      <div
                        key={tierKey}
                        onClick={() => setSelectedTier(tierKey)}
                        style={{
                          background: isSelected ? 'rgba(0, 82, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                          border: isSelected ? '1px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px 14px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.825rem', fontWeight: 600, color: isSelected ? '#ffffff' : 'var(--text-secondary)' }}>
                            {tier.name.split(' ')[0]}
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#60a5fa' }}>
                            {tier.priceEth} ETH
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.35, margin: 0 }}>
                          {tier.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              {!currentChallenge && !agentResult && (
                <button
                  onClick={handleInitiateQuery}
                  disabled={isProcessing || !queryInput.trim()}
                  className="btn-base"
                  style={{ width: '100%', padding: '12px', fontSize: '0.9rem' }}
                >
                  <Send size={16} />
                  {isProcessing ? 'Initiating 402 Handshake...' : `Dispatch Query (${SERVICE_TIERS[selectedTier].priceEth} ETH)`}
                </button>
              )}

              {/* HTTP 402 Challenge Card */}
              {currentChallenge && (
                <div
                  style={{
                    background: 'rgba(0, 82, 255, 0.06)',
                    border: '1px solid rgba(0, 82, 255, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Shield size={18} color="#60a5fa" />
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff' }}>
                        HTTP 402: Payment Required
                      </span>
                    </div>
                    <span className="pill pill-base">Base Sepolia</span>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {currentChallenge.message}
                  </p>

                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      fontSize: '0.775rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Amount: </span>
                      <strong style={{ color: '#ffffff' }}>{currentChallenge.amountEth} ETH</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Invoice: </span>
                      <code style={{ color: '#60a5fa' }}>{currentChallenge.invoiceId}</code>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Recipient: </span>
                      <code style={{ color: '#cbd5e1' }}>{currentChallenge.recipientAddress}</code>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={handleFulfillPayment}
                      disabled={isProcessing}
                      className="btn-base"
                      style={{ flex: 1, padding: '10px' }}
                    >
                      <Coins size={16} />
                      {isProcessing ? 'Verifying on Base Sepolia...' : 'Authorize & Pay (1-Click)'}
                    </button>
                    <button
                      onClick={resetForm}
                      disabled={isProcessing}
                      className="btn-secondary"
                      style={{ padding: '10px 16px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Execution Stepper / Progress */}
            {isProcessing && (
              <div className="card-clean" style={{ padding: '18px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <RefreshCw size={18} color="#0052ff" className="spin" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
                      {activeStep || 'Executing autonomous reasoning...'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Evaluating Base Sepolia state & synthesizing intelligence
                    </div>
                  </div>
                </div>

                {liveLogs.length > 0 && (
                  <div
                    style={{
                      marginTop: '14px',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    {liveLogs.map((log) => (
                      <div
                        key={log.id}
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <CheckCircle2 size={13} color="#10b981" />
                        <span>{log.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Synthesized Output Result */}
            {agentResult && (
              <div className="card-clean" style={{ padding: '24px' }}>
                {/* Result Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '18px',
                    paddingBottom: '14px',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={18} color="#10b981" />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                      Verified Intelligence Report
                    </h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <a
                      href={`${BASE_SEPOLIA_EXPLORER}/tx/${agentResult.paymentTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary"
                      style={{ fontSize: '0.775rem', padding: '6px 12px' }}
                    >
                      <ExternalLink size={13} />
                      View Basescan Tx
                    </a>
                    <button
                      onClick={resetForm}
                      className="btn-secondary"
                      style={{ fontSize: '0.775rem', padding: '6px 12px' }}
                    >
                      New Query
                    </button>
                  </div>
                </div>

                {/* Summary */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    marginBottom: '18px',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    EXECUTIVE SUMMARY
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#e2e8f0', lineHeight: 1.55 }}>
                    {agentResult.executiveSummary}
                  </p>
                </div>

                {/* Findings List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    KEY FINDINGS & INVARIANTS
                  </div>
                  {agentResult.findings.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px 14px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '4px',
                        }}
                      >
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>
                          {f.title}
                        </span>
                        <span className="pill pill-muted" style={{ fontSize: '0.7rem' }}>
                          {(f.confidenceScore * 100).toFixed(0)}% Confidence
                        </span>
                      </div>
                      <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                        {f.summary}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Settlement Metadata Footer */}
                <div
                  style={{
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    fontSize: '0.775rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <div>
                    Sub-Agents Executed: <strong style={{ color: '#ffffff' }}>{agentResult.subagentsExecuted.length}</strong>
                  </div>
                  <div>
                    Query Payment: <strong style={{ color: '#60a5fa' }}>{agentResult.amountPaidEth} ETH</strong>
                  </div>
                  <div>
                    Oracle Net Margin: <strong style={{ color: '#34d399' }}>+{agentResult.agentProfitEth} ETH</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: TREASURY ================= */}
        {activeTab === 'treasury' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header & Metrics */}
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                Treasury & Sub-Agent Ledger
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Transparent on-chain settlement accounting for incoming x402 payments and autonomous worker bounties.
              </p>
            </div>

            {/* Metrics cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div className="card-clean" style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>TREASURY BALANCE</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ffffff' }}>
                  {agentState.treasuryBalanceEth} ETH
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  ≈ ${agentState.treasuryBalanceUsdc} USDC
                </div>
              </div>

              <div className="card-clean" style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>TOTAL REVENUE</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#34d399' }}>
                  +{agentState.totalRevenueEth} ETH
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Base Sepolia Settled
                </div>
              </div>

              <div className="card-clean" style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>QUERIES PROCESSED</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#60a5fa' }}>
                  {agentState.totalQueriesProcessed}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  100% On-Chain Verifiable
                </div>
              </div>
            </div>

            {/* Registered Worker Sub-Agents */}
            <div className="card-clean" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '0.925rem', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>
                Autonomous Worker Sub-Agents
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                {REGISTERED_SUBAGENTS.map((sub) => (
                  <div
                    key={sub.id}
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.825rem', color: '#f8fafc' }}>{sub.name}</strong>
                      <span className="pill pill-emerald" style={{ fontSize: '0.65rem' }}>ACTIVE</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>{sub.role}</div>
                    <code style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {sub.walletAddress.slice(0, 10)}...{sub.walletAddress.slice(-6)}
                    </code>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction Ledger Table */}
            <div className="card-clean" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '0.925rem', fontWeight: 600, color: '#ffffff', marginBottom: '14px' }}>
                Recent Transactions
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '10px 8px' }}>Type</th>
                      <th style={{ padding: '10px 8px' }}>Amount</th>
                      <th style={{ padding: '10px 8px' }}>Description</th>
                      <th style={{ padding: '10px 8px' }}>Tx Hash</th>
                      <th style={{ padding: '10px 8px' }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((tx) => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '10px 8px' }}>
                          <span className={tx.type === 'INCOMING_X402_PAYMENT' ? 'pill pill-emerald' : 'pill pill-base'}>
                            {tx.type === 'INCOMING_X402_PAYMENT' ? 'Payment' : 'Bounty'}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '10px 8px',
                            fontWeight: 600,
                            color: tx.amountEth.startsWith('+') ? '#34d399' : '#f87171',
                          }}
                        >
                          {tx.amountEth} ETH
                        </td>
                        <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>
                          {tx.description}
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <a
                            href={tx.explorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                          >
                            <code>{tx.txHash.slice(0, 8)}...</code>
                            <ExternalLink size={11} />
                          </a>
                        </td>
                        <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>
                          {new Date(tx.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: DEVELOPERS / DOCS ================= */}
        {activeTab === 'docs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                Developer Integration & x402 Spec
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                How external AI agents and client applications consume NEXUS-402 programmatically.
              </p>
            </div>

            {/* Protocol Steps Overview */}
            <div className="card-clean" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '0.925rem', fontWeight: 600, color: '#ffffff', marginBottom: '10px' }}>
                HTTP 402 Handshake Lifecycle
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', marginBottom: '4px' }}>
                    1. PROBE
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Client sends POST without payment. Server returns HTTP 402 with recipient address and price in Wei.
                  </p>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', marginBottom: '4px' }}>
                    2. SETTLE
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Client broadcasts transaction on Base Sepolia and acquires transaction hash proof.
                  </p>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a78bfa', marginBottom: '4px' }}>
                    3. FULFILL
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Client repeats POST with <code>X-402-Payment-Proof</code>. Server verifies on-chain and streams payload.
                  </p>
                </div>
              </div>
            </div>

            {/* cURL Snippet */}
            <div className="card-clean" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '0.925rem', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
                cURL Integration Example
              </h3>
              <pre
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.775rem',
                  color: '#93c5fd',
                  overflowX: 'auto',
                  border: '1px solid var(--border-subtle)',
                }}
              >
{`# 1. Probe for HTTP 402 invoice
curl -i -X POST /api/x402/query \\
  -H "Content-Type: application/json" \\
  -d '{"query": "Audit Base Sepolia Vault invariants", "tier": "deep"}'

# 2. Settle on Base Sepolia and attach payment proof
curl -X POST /api/x402/query \\
  -H "Content-Type: application/json" \\
  -H "X-402-Payment-Proof: txHash=0x9a8f...; payerAddress=0x7099...; invoiceId=inv_172832" \\
  -d '{"query": "Audit Base Sepolia Vault invariants", "tier": "deep"}'`}
              </pre>
            </div>

            {/* TypeScript / Viem Snippet */}
            <div className="card-clean" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '0.925rem', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
                TypeScript SDK (viem / AgentKit)
              </h3>
              <pre
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.775rem',
                  color: '#cbd5e1',
                  overflowX: 'auto',
                  border: '1px solid var(--border-subtle)',
                }}
              >
{`import { parseEther } from 'viem';
import { baseSepolia } from 'viem/chains';

async function queryNexus402(prompt: string) {
  // Step 1: Probe endpoint
  const init = await fetch('/api/x402/query', {
    method: 'POST',
    body: JSON.stringify({ query: prompt, tier: 'deep' })
  });

  if (init.status === 402) {
    const challenge = await init.json();

    // Step 2: Settle on Base Sepolia
    const txHash = await walletClient.sendTransaction({
      to: challenge.recipientAddress,
      value: parseEther(challenge.amountEth),
      chain: baseSepolia
    });

    // Step 3: Redeem verified intelligence
    const res = await fetch('/api/x402/query', {
      method: 'POST',
      headers: {
        'X-402-Payment-Proof': \`txHash=\${txHash}; invoiceId=\${challenge.invoiceId}\`
      },
      body: JSON.stringify({ query: prompt, tier: 'deep' })
    });
    return await res.json();
  }
}`}
              </pre>
            </div>
          </div>
        )}
      </main>

      {/* Clean, Understated Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(10, 13, 20, 0.95)',
          padding: '16px 24px',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
        }}
      >
        <div
          style={{
            maxWidth: '1180px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#cbd5e1', fontWeight: 600 }}>NEXUS-402</span>
            <span>•</span>
            <span>x402 Micropayment Protocol on Base Sepolia (84532)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a
              href={`${BASE_SEPOLIA_EXPLORER}/address/${AGENT_WALLET_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>Contract Explorer</span>
              <ExternalLink size={12} />
            </a>
            <a
              href="https://github.com/prerana-techi/agentic"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>GitHub</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
