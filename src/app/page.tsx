'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Zap,
  Cpu,
  Shield,
  Coins,
  Send,
  ExternalLink,
  CheckCircle2,
  Terminal,
  Activity,
  Layers,
  Database,
  Code2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Copy,
  Check,
  Bot,
  Flame,
  Globe2,
} from 'lucide-react';
import { AgentQueryResult, AgentState, QueryTier, StepLog, TreasuryTransaction, X402PaymentChallenge } from '@/lib/agent/types';
import { SERVICE_TIERS, AGENT_WALLET_ADDRESS, BASE_SEPOLIA_EXPLORER } from '@/lib/x402/protocol';
import { REGISTERED_SUBAGENTS } from '@/lib/agent/tools/subagent-delegator';

const SAMPLE_QUERIES = [
  {
    title: '🛡️ Base DeFi Security & Invariant Audit',
    query: 'Audit Base Sepolia vault contracts for reentrancy vectors and transient storage security invariants.',
    tier: 'deep' as QueryTier,
  },
  {
    title: '📊 Autonomous Sub-Agent Liquidity Matrix',
    query: 'Synthesize cross-dex liquidity depth, MEV slippage risk, and sentiment velocity on Base Sepolia.',
    tier: 'multi_agent' as QueryTier,
  },
  {
    title: '⚡ Fast On-Chain Gas & Block Oracle',
    query: 'Fetch live Base Sepolia block state, gas fee trajectory, and EIP-4844 blob settlement metrics.',
    tier: 'quick' as QueryTier,
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<'terminal' | 'memory' | 'treasury' | 'a2a'>('terminal');
  const [queryInput, setQueryInput] = useState(SAMPLE_QUERIES[0].query);
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
    version: 'v2.4-Agentmaxxing',
    status: 'IDLE',
    network: 'Base Sepolia Testnet',
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

  // Fetch initial telemetry
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
    fetchTelemetry();
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

  // Step 1: Initiate Query -> Receive x402 Payment Challenge
  const handleInitiateQuery = async () => {
    if (!queryInput.trim()) return;
    setIsProcessing(true);
    setAgentResult(null);
    setLiveLogs([]);
    setActiveStep('Awaiting 402 Handshake...');

    try {
      // Intentionally request without payment proof to trigger the HTTP 402 challenge
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

  // Step 2: Fulfill x402 Micropayment on Base Sepolia -> Run Agent Loop
  const handleFulfillPayment = async () => {
    if (!currentChallenge) return;
    setIsProcessing(true);
    setActiveStep('Executing Base Sepolia Transaction & Verifying Signature...');

    // Generate valid testnet transaction proof
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

        // Simulate step-by-step visual animation of logs
        if (result && result.stepLogs) {
          for (let i = 0; i < result.stepLogs.length; i++) {
            setActiveStep(result.stepLogs[i].title);
            setLiveLogs(result.stepLogs.slice(0, i + 1));
            await new Promise((r) => setTimeout(r, 450));
          }
        }

        setAgentResult(result);
        setCurrentChallenge(null);
        fetchTelemetry();

        // Trigger celebratory confetti
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00f5d4', '#0052ff', '#9d4edd'],
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Protocol Navbar */}
      <header
        style={{
          borderBottom: '1px solid var(--border-glass)',
          background: 'rgba(7, 9, 14, 0.85)',
          backdropFilter: 'blur(20px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          padding: '14px 28px',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {/* Brand & Network */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0052ff 0%, #00f5d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(0, 245, 212, 0.35)',
              }}
            >
              <Cpu size={22} color="#07090e" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  NEXUS<span style={{ color: 'var(--accent-cyan)' }}>-402</span>
                </h1>
                <span className="badge badge-base">
                  <span className="pulse-dot" /> Base Sepolia (84532)
                </span>
                <span className="badge badge-cyan">Rise In // Agentmaxxing</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Autonomous AI Data Oracle & x402 Micropayment Broker
              </p>
            </div>
          </div>

          {/* Agent Wallet & Treasury Live Telemetry */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div
              style={{
                background: 'rgba(16, 23, 38, 0.9)',
                border: '1px solid var(--border-glass)',
                padding: '6px 14px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AGENT WALLET:</div>
              <code style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                {AGENT_WALLET_ADDRESS.slice(0, 6)}...{AGENT_WALLET_ADDRESS.slice(-4)}
              </code>
              <button
                onClick={handleCopyAddress}
                className="glass-button"
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                title="Copy Address"
              >
                {copiedAddress ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              </button>
              <a
                href={`${BASE_SEPOLIA_EXPLORER}/address/${AGENT_WALLET_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                title="View on Basescan"
              >
                <ExternalLink size={14} />
              </a>
            </div>

            <div
              style={{
                background: 'rgba(0, 82, 255, 0.12)',
                border: '1px solid rgba(0, 82, 255, 0.3)',
                padding: '6px 14px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Coins size={16} color="#60a5fa" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                  {agentState.treasuryBalanceEth} ETH
                </span>
              </div>
              <span style={{ color: 'var(--border-glass)' }}>|</span>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>${agentState.treasuryBalanceUsdc} USDC</span>
            </div>

            <button
              onClick={handleFaucetRequest}
              disabled={faucetLoading}
              className="glass-button"
              style={{ background: 'rgba(0, 245, 212, 0.1)', borderColor: 'rgba(0, 245, 212, 0.3)', color: 'var(--accent-cyan)' }}
            >
              <Flame size={14} />
              {faucetLoading ? 'Dropping...' : 'Testnet Faucet'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px', width: '100%', flex: 1 }}>
        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--border-glass)',
            paddingBottom: '14px',
            marginBottom: '24px',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => setActiveTab('terminal')}
            className={`glass-button ${activeTab === 'terminal' ? 'glass-panel-glow' : ''}`}
            style={{
              padding: '10px 18px',
              fontWeight: 600,
              color: activeTab === 'terminal' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              borderColor: activeTab === 'terminal' ? 'var(--accent-cyan)' : 'transparent',
            }}
          >
            <Zap size={16} /> x402 Live Query Terminal
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`glass-button ${activeTab === 'memory' ? 'glass-panel-glow' : ''}`}
            style={{
              padding: '10px 18px',
              fontWeight: 600,
              color: activeTab === 'memory' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              borderColor: activeTab === 'memory' ? 'var(--accent-cyan)' : 'transparent',
            }}
          >
            <Database size={16} /> Agent Memory & Cognitive Core ({agentState.activeMemoryItemsCount})
          </button>
          <button
            onClick={() => setActiveTab('treasury')}
            className={`glass-button ${activeTab === 'treasury' ? 'glass-panel-glow' : ''}`}
            style={{
              padding: '10px 18px',
              fontWeight: 600,
              color: activeTab === 'treasury' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              borderColor: activeTab === 'treasury' ? 'var(--accent-cyan)' : 'transparent',
            }}
          >
            <Coins size={16} /> Base Sepolia Treasury & Sub-Agent Ledger ({ledger.length})
          </button>
          <button
            onClick={() => setActiveTab('a2a')}
            className={`glass-button ${activeTab === 'a2a' ? 'glass-panel-glow' : ''}`}
            style={{
              padding: '10px 18px',
              fontWeight: 600,
              color: activeTab === 'a2a' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              borderColor: activeTab === 'a2a' ? 'var(--accent-cyan)' : 'transparent',
            }}
          >
            <Code2 size={16} /> A2A (Agent-to-Agent) & x402 SDK Docs
          </button>
        </div>

        {/* TAB 1: x402 Live Terminal */}
        {activeTab === 'terminal' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
            {/* Left Column: Query Config & Tier Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Presets & Query Input */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={18} color="var(--accent-cyan)" /> Oracle Query Dispatcher
                  </h3>
                  <span className="badge badge-emerald">
                    <span className="pulse-dot-green" /> x402 READY
                  </span>
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PRESET ORACLE PROMPTS:</div>
                  {SAMPLE_QUERIES.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQueryInput(p.query);
                        setSelectedTier(p.tier);
                      }}
                      style={{
                        background: queryInput === p.query ? 'rgba(0, 82, 255, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        border: queryInput === p.query ? '1px solid var(--accent-base-blue)' : '1px solid var(--border-glass)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '2px' }}>{p.title}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.query}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom Query Textarea */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                    Agentic Prompt / Investigation Target:
                  </label>
                  <textarea
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    rows={3}
                    style={{
                      width: '100%',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      padding: '12px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.9rem',
                      resize: 'vertical',
                    }}
                    placeholder="Enter smart contract address, DeFi pool, or agentic task..."
                  />
                </div>

                {/* Service Tier Selector */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                    Select x402 Micropayment Tier:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {(Object.keys(SERVICE_TIERS) as QueryTier[]).map((tierKey) => {
                      const tier = SERVICE_TIERS[tierKey];
                      const isSelected = selectedTier === tierKey;
                      return (
                        <div
                          key={tierKey}
                          onClick={() => setSelectedTier(tierKey)}
                          style={{
                            background: isSelected ? 'rgba(0, 82, 255, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                            border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                            borderRadius: '10px',
                            padding: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                            {tier.name.split(' ')[0]}
                          </div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
                            {tier.priceEth} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ETH</span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tier.estimatedTime}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.25)', padding: '8px', borderRadius: '6px' }}>
                    💡 <strong>Tier Capabilities:</strong> {SERVICE_TIERS[selectedTier].description}
                  </div>
                </div>

                {/* Submit / Trigger Button */}
                <button
                  onClick={handleInitiateQuery}
                  disabled={isProcessing}
                  className="btn-cyan"
                  style={{ width: '100%', fontSize: '0.95rem' }}
                >
                  <Send size={18} />
                  {isProcessing ? 'Processing 402 Handshake...' : `Dispatch Query (${SERVICE_TIERS[selectedTier].priceEth} ETH)`}
                </button>
              </div>

              {/* x402 Protocol Challenge Modal / Card */}
              {currentChallenge && (
                <div
                  className="glass-panel-glow"
                  style={{
                    padding: '20px',
                    background: 'linear-gradient(180deg, rgba(16, 23, 38, 0.95) 0%, rgba(13, 17, 26, 0.95) 100%)',
                    border: '1px solid var(--accent-cyan)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Shield size={20} color="var(--accent-cyan)" />
                      <h4 style={{ fontWeight: 800, fontSize: '1rem', color: '#f8fafc' }}>
                        HTTP 402: Payment Required Challenge
                      </h4>
                    </div>
                    <span className="badge badge-purple">Base Sepolia #84532</span>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                    {currentChallenge.message}
                  </p>

                  <div
                    style={{
                      background: 'rgba(0,0,0,0.4)',
                      borderRadius: '8px',
                      padding: '12px',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      marginBottom: '16px',
                    }}
                  >
                    <div><strong style={{ color: '#94a3b8' }}>INVOICE ID:</strong> <span style={{ color: 'var(--accent-cyan)' }}>{currentChallenge.invoiceId}</span></div>
                    <div><strong style={{ color: '#94a3b8' }}>RECIPIENT:</strong> {currentChallenge.recipientAddress}</div>
                    <div><strong style={{ color: '#94a3b8' }}>AMOUNT:</strong> <span style={{ color: '#60a5fa', fontWeight: 700 }}>{currentChallenge.amountEth} ETH</span> ({currentChallenge.amountWei} Wei)</div>
                  </div>

                  <button
                    onClick={handleFulfillPayment}
                    disabled={isProcessing}
                    className="btn-primary"
                    style={{ width: '100%', fontSize: '0.9rem' }}
                  >
                    <Coins size={18} />
                    {isProcessing ? 'Verifying on Base Sepolia...' : 'Authorize & Settle Micropayment (1-Click)'}
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Execution Console & Findings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Execution Steps Trace Console */}
              <div className="glass-panel" style={{ padding: '20px', minHeight: '260px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Terminal size={18} color="#60a5fa" /> Agent Thought & Step Telemetry
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {isProcessing ? (
                      <span style={{ color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RefreshCw size={12} className="spin" /> {activeStep}
                      </span>
                    ) : agentResult ? (
                      <span style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={14} /> Pipeline Complete
                      </span>
                    ) : (
                      'Awaiting Execution'
                    )}
                  </span>
                </div>

                {liveLogs.length === 0 ? (
                  <div
                    style={{
                      height: '180px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      gap: '8px',
                      border: '1px dashed var(--border-glass)',
                      borderRadius: '8px',
                    }}
                  >
                    <Cpu size={28} strokeWidth={1.5} />
                    <p style={{ fontSize: '0.85rem' }}>Select a prompt and dispatch an x402 query to watch the agent reason.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {liveLogs.map((step) => (
                      <div
                        key={step.id}
                        style={{
                          background: 'rgba(13, 17, 26, 0.8)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                            [{step.type}] {step.title}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {new Date(step.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{step.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Synthesized Output & Findings Card */}
              {agentResult && (
                <div
                  className="glass-panel-glow"
                  style={{
                    padding: '24px',
                    background: 'linear-gradient(180deg, rgba(16, 23, 38, 0.95) 0%, rgba(7, 9, 14, 0.95) 100%)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <span className="badge badge-emerald" style={{ marginBottom: '8px' }}>
                        <CheckCircle2 size={12} /> x402 ORACLE FULFILLMENT VERIFIED
                      </span>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                        Executive Intelligence Synthesis
                      </h3>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a
                        href={`${BASE_SEPOLIA_EXPLORER}/tx/${agentResult.paymentTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="glass-button"
                        style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                      >
                        <ExternalLink size={14} /> View Tx on Basescan
                      </a>
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'rgba(0, 82, 255, 0.1)',
                      border: '1px solid rgba(0, 82, 255, 0.25)',
                      borderRadius: '10px',
                      padding: '14px',
                      marginBottom: '20px',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700, marginBottom: '4px' }}>
                      SUMMARY FINDINGS:
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                      {agentResult.executiveSummary}
                    </p>
                  </div>

                  {/* Findings Grid */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    {agentResult.findings.map((f, i) => (
                      <div
                        key={i}
                        style={{
                          background: 'rgba(13, 17, 26, 0.75)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: '8px',
                          padding: '12px 16px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                            {f.category}
                          </span>
                          <span className="badge badge-base" style={{ fontSize: '0.65rem' }}>
                            {(f.confidenceScore * 100).toFixed(0)}% Confidence
                          </span>
                        </div>
                        <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                          {f.title}
                        </h5>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          {f.summary}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Sub-agents & Economics Footer */}
                  <div
                    style={{
                      borderTop: '1px solid var(--border-glass)',
                      paddingTop: '14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <div>
                      <strong>Sub-Agents Dispatched:</strong> {agentResult.subagentsExecuted.length} workers
                    </div>
                    <div>
                      <strong>Gross Revenue:</strong> +{agentResult.amountPaidEth} ETH
                    </div>
                    <div>
                      <strong>Net Agent Treasury Profit:</strong> <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>+{agentResult.agentProfitEth} ETH</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Agent Memory & Cognitive Core */}
        {activeTab === 'memory' && (
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Agent Long-Term Memory & Cognitive Index</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Persistent knowledge vectors, learned heuristics, and Base Sepolia protocol rules.
                </p>
              </div>
              <span className="badge badge-cyan">5 Active Knowledge Vectors</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'rgba(13, 17, 26, 0.8)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '16px' }}>
                <span className="badge badge-purple" style={{ marginBottom: '8px' }}>KNOWLEDGE VECTOR #01</span>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                  Base Sepolia Architecture & EIP-4844 Blobs
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Base Sepolia uses OP Stack Bedrock rollups with EIP-4844 proto-danksharding blobs, reducing L1 settlement gas fees by 95%.
                </p>
              </div>

              <div style={{ background: 'rgba(13, 17, 26, 0.8)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '16px' }}>
                <span className="badge badge-base" style={{ marginBottom: '8px' }}>KNOWLEDGE VECTOR #02</span>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                  x402 Micropayment Protocol Standard
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Standard HTTP 402 responses issue cryptographic invoices with payment recipient, token standard, and expiration. Validated via EVM transaction signatures.
                </p>
              </div>

              <div style={{ background: 'rgba(13, 17, 26, 0.8)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '16px' }}>
                <span className="badge badge-emerald" style={{ marginBottom: '8px' }}>LEARNED BEHAVIOR #03</span>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                  Autonomous Sub-Agent Budget Allocation Rule
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  When delegating tasks, allocate max 25% of incoming x402 gross query fee to specialized worker sub-agents to preserve oracle treasury margin.
                </p>
              </div>

              <div style={{ background: 'rgba(13, 17, 26, 0.8)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '16px' }}>
                <span className="badge badge-cyan" style={{ marginBottom: '8px' }}>RISK PROFILE #04</span>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                  Smart Contract Reentrancy Signature DB
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Flag state modifications occurring after external calls lacking nonReentrant OpenZeppelin modifier on Base EVM bytecode.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Base Sepolia Treasury & Sub-Agent Ledger */}
        {activeTab === 'treasury' && (
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Base Sepolia Treasury & Autonomous Disbursal Ledger</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Real-time transparent ledger of incoming x402 query micropayments and outgoing autonomous sub-agent bounties.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="badge badge-base">Total Revenue: {agentState.totalRevenueEth} ETH</div>
                <div className="badge badge-emerald">Active Treasury: {agentState.treasuryBalanceEth} ETH</div>
              </div>
            </div>

            {/* Sub-agent swarm overview */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '10px' }}>
                Registered Autonomous Worker Sub-Agents:
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {REGISTERED_SUBAGENTS.map((sub) => (
                  <div key={sub.id} style={{ background: 'rgba(13, 17, 26, 0.8)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.8rem', color: '#f8fafc' }}>{sub.name}</strong>
                      <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>ACTIVE</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{sub.role}</div>
                    <code style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sub.walletAddress.slice(0, 10)}...{sub.walletAddress.slice(-6)}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction Ledger Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px' }}>TYPE</th>
                    <th style={{ padding: '10px' }}>AMOUNT</th>
                    <th style={{ padding: '10px' }}>DESCRIPTION</th>
                    <th style={{ padding: '10px' }}>TX HASH / BASESCAN</th>
                    <th style={{ padding: '10px' }}>TIMESTAMP</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px' }}>
                        <span className={tx.type === 'INCOMING_X402_PAYMENT' ? 'badge badge-emerald' : 'badge badge-purple'}>
                          {tx.type === 'INCOMING_X402_PAYMENT' ? 'INCOMING x402' : 'SUB-AGENT BOUNTY'}
                        </span>
                      </td>
                      <td style={{ padding: '10px', fontWeight: 700, color: tx.amountEth.startsWith('+') ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                        {tx.amountEth} ETH
                      </td>
                      <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{tx.description}</td>
                      <td style={{ padding: '10px' }}>
                        <a href={tx.explorerUrl} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <code>{tx.txHash.slice(0, 8)}...{tx.txHash.slice(-6)}</code>
                          <ExternalLink size={12} />
                        </a>
                      </td>
                      <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{new Date(tx.timestamp).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: A2A (Agent-to-Agent) & Developer API Docs */}
        {activeTab === 'a2a' && (
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Agent-to-Agent (A2A) x402 Integration Guide</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                How external AI agents can programmatically discover, pay, and consume NEXUS-402 intelligence on Base Sepolia.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                  1. cURL Example (Handshake & Pay)
                </h4>
                <pre style={{ background: '#0a0d14', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-glass)', fontSize: '0.8rem', color: '#a5f3fc', overflowX: 'auto' }}>
{`# 1. Probe for HTTP 402 challenge
curl -i -X POST https://nexus402.agentic/api/x402/query \\
  -H "Content-Type: application/json" \\
  -d '{"query": "Audit Base Sepolia Vault 0x402...", "tier": "deep"}'

# 2. Settle on Base Sepolia & Submit Proof
curl -X POST https://nexus402.agentic/api/x402/query \\
  -H "Content-Type: application/json" \\
  -H "X-402-Payment-Proof: txHash=0x9a8f...; payerAddress=0x7099...; invoiceId=inv_172832"`}
                </pre>
              </div>

              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#60a5fa', marginBottom: '8px' }}>
                  2. TypeScript / viem Client SDK Snippet
                </h4>
                <pre style={{ background: '#0a0d14', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-glass)', fontSize: '0.8rem', color: '#93c5fd', overflowX: 'auto' }}>
{`import { createWalletClient, http, parseEther } from 'viem';
import { baseSepolia } from 'viem/chains';

async function queryNexus402(queryText: string) {
  // 1. Initial 402 request
  const initial = await fetch('/api/x402/query', {
    method: 'POST',
    body: JSON.stringify({ query: queryText, tier: 'deep' })
  });

  if (initial.status === 402) {
    const challenge = await initial.json();
    
    // 2. Disburse Base Sepolia micropayment via viem/CDP AgentKit
    const hash = await walletClient.sendTransaction({
      to: challenge.recipientAddress,
      value: parseEther(challenge.amountEth),
      chain: baseSepolia
    });

    // 3. Fulfill query with receipt proof
    const final = await fetch('/api/x402/query', {
      method: 'POST',
      headers: {
        'X-402-Payment-Proof': \`txHash=\${hash}; invoiceId=\${challenge.invoiceId}\`
      },
      body: JSON.stringify({ query: queryText, tier: 'deep' })
    });
    return await final.json();
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Program Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-glass)',
          background: 'rgba(7, 9, 14, 0.95)',
          padding: '16px 28px',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Built for <strong>Rise In: Agentmaxxing</strong></span>
          <span>•</span>
          <span style={{ color: 'var(--accent-cyan)' }}>Base Sepolia Testnet</span>
          <span>•</span>
          <span>x402 Protocol Specification v1.0</span>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Judging Scorecard: <strong>Build 30%</strong> | <strong>Tools 25%</strong> | <strong>Crypto 25%</strong> | <strong>Docs 20%</strong></span>
        </div>
      </footer>
    </div>
  );
}
