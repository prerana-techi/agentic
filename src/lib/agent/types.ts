export type QueryTier = 'quick' | 'deep' | 'multi_agent';

export interface TierConfig {
  id: QueryTier;
  name: string;
  priceEth: string;
  priceWei: string;
  estimatedTime: string;
  description: string;
  toolsEnabled: string[];
  features: string[];
}

export interface X402PaymentChallenge {
  error: string;
  code: 402;
  message: string;
  invoiceId: string;
  network: string;
  chainId: number;
  recipientAddress: string;
  amountEth: string;
  amountWei: string;
  token: 'ETH' | 'USDC';
  validUntil: number;
  paymentInstructions: {
    directTransfer: string;
    requiredHeader: string;
    sampleHeaderValue: string;
  };
}

export interface StepLog {
  id: string;
  timestamp: string;
  type: 'PAYMENT_VERIFIED' | 'PLANNING' | 'TOOL_CALL' | 'SUBAGENT_DELEGATED' | 'ONCHAIN_ACTION' | 'SYNTHESIS';
  title: string;
  detail: string;
  metadata?: Record<string, any>;
  costEth?: string;
}

export interface SubAgentTask {
  id: string;
  name: string;
  role: string;
  prompt: string;
  bountyEth: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED';
  result?: string;
  txHash?: string;
}

export interface AgentQueryResult {
  query: string;
  tier: QueryTier;
  invoiceId: string;
  payerAddress: string;
  paymentTxHash: string;
  amountPaidEth: string;
  createdAt: string;
  completedAt: string;
  executiveSummary: string;
  findings: {
    category: string;
    title: string;
    summary: string;
    confidenceScore: number;
    sources: string[];
  }[];
  onchainData?: {
    chain: string;
    targetContractOrAddress?: string;
    gasPriceGwei: string;
    networkCongestion: string;
    riskScore: 'LOW' | 'MEDIUM' | 'HIGH';
    verifiedOnBasescan: boolean;
  };
  subagentsExecuted: SubAgentTask[];
  stepLogs: StepLog[];
  agentProfitEth: string;
  agentGasSpentEth: string;
}

export interface TreasuryTransaction {
  id: string;
  timestamp: string;
  type: 'INCOMING_X402_PAYMENT' | 'SUBAGENT_BOUNTY_PAYOUT' | 'TOOL_GAS_BURN' | 'TREASURY_REBALANCE';
  amountEth: string;
  txHash: string;
  from: string;
  to: string;
  description: string;
  explorerUrl: string;
}

export interface AgentState {
  name: string;
  version: string;
  status: 'IDLE' | 'PROCESSING' | 'VERIFYING_PAYMENT' | 'SYNTHESIZING' | 'DELEGATING';
  network: string;
  chainId: number;
  walletAddress: string;
  treasuryBalanceEth: string;
  treasuryBalanceUsdc: string;
  totalQueriesProcessed: number;
  totalRevenueEth: string;
  activeMemoryItemsCount: number;
  registeredSubagents: number;
}
