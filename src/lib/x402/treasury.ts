import { TreasuryTransaction, AgentState } from '../agent/types';
import { AGENT_WALLET_ADDRESS, BASE_SEPOLIA_CHAIN_ID, BASE_SEPOLIA_EXPLORER } from './protocol';

// Initial state for the agent's autonomous wallet & treasury
let treasuryBalanceEth = 0.0485;
let treasuryBalanceUsdc = 210.5;
let totalQueriesProcessed = 19;
let totalRevenueEth = 0.0248;

const transactionLedger: TreasuryTransaction[] = [
  {
    id: 'tx_seed_01',
    timestamp: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    type: 'INCOMING_X402_PAYMENT',
    amountEth: '+0.0015',
    txHash: '0x9a8f412d0834ef19a877d9c02587dae613b190f7a77d12f4581290bb356c9a01',
    from: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    to: AGENT_WALLET_ADDRESS,
    description: 'x402 Micropayment for Multi-Subagent Matrix query',
    explorerUrl: `${BASE_SEPOLIA_EXPLORER}/tx/0x9a8f412d0834ef19a877d9c02587dae613b190f7a77d12f4581290bb356c9a01`,
  },
  {
    id: 'tx_seed_02',
    timestamp: new Date(Date.now() - 3600 * 1000 * 3.8).toISOString(),
    type: 'SUBAGENT_BOUNTY_PAYOUT',
    amountEth: '-0.0003',
    txHash: '0x3cb710fa982a510f8a8461754029283e16b930d674b09cf938006e87391d84f2',
    from: AGENT_WALLET_ADDRESS,
    to: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    description: 'Bounty to Sub-Agent [SecurityAuditor-BaseSepolia]',
    explorerUrl: `${BASE_SEPOLIA_EXPLORER}/tx/0x3cb710fa982a510f8a8461754029283e16b930d674b09cf938006e87391d84f2`,
  },
  {
    id: 'tx_seed_03',
    timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    type: 'INCOMING_X402_PAYMENT',
    amountEth: '+0.0008',
    txHash: '0x1c8b320fae92810ab1987d6529304857102938475869201a0928374650192837',
    from: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    to: AGENT_WALLET_ADDRESS,
    description: 'x402 Micropayment for Deep Protocol Intel query',
    explorerUrl: `${BASE_SEPOLIA_EXPLORER}/tx/0x1c8b320fae92810ab1987d6529304857102938475869201a0928374650192837`,
  },
];

export class AgentTreasury {
  static getState(): AgentState {
    return {
      name: 'NEXUS-402 Autonomous Oracle',
      version: 'v2.4-Agentmaxxing',
      status: 'IDLE',
      network: 'Base Sepolia Testnet',
      chainId: BASE_SEPOLIA_CHAIN_ID,
      walletAddress: AGENT_WALLET_ADDRESS,
      treasuryBalanceEth: treasuryBalanceEth.toFixed(4),
      treasuryBalanceUsdc: treasuryBalanceUsdc.toFixed(2),
      totalQueriesProcessed,
      totalRevenueEth: totalRevenueEth.toFixed(4),
      activeMemoryItemsCount: 142,
      registeredSubagents: 4,
    };
  }

  static recordIncomingPayment(amountEth: string, payer: string, txHash: string, queryTitle: string): TreasuryTransaction {
    const numAmount = parseFloat(amountEth) || 0.0005;
    treasuryBalanceEth += numAmount;
    totalRevenueEth += numAmount;
    totalQueriesProcessed += 1;

    const tx: TreasuryTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: 'INCOMING_X402_PAYMENT',
      amountEth: `+${numAmount.toFixed(4)}`,
      txHash: txHash || `0x${Math.random().toString(16).substring(2, 66).padEnd(64, '0')}`,
      from: payer,
      to: AGENT_WALLET_ADDRESS,
      description: `x402 Micropayment: ${queryTitle.slice(0, 45)}...`,
      explorerUrl: `${BASE_SEPOLIA_EXPLORER}/tx/${txHash}`,
    };

    transactionLedger.unshift(tx);
    return tx;
  }

  static disburseSubAgentBounty(subAgentName: string, subAgentWallet: string, bountyEth: string): TreasuryTransaction {
    const numAmount = parseFloat(bountyEth) || 0.0002;
    treasuryBalanceEth = Math.max(0, treasuryBalanceEth - numAmount);

    const mockHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    const tx: TreasuryTransaction = {
      id: `tx_sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: 'SUBAGENT_BOUNTY_PAYOUT',
      amountEth: `-${numAmount.toFixed(4)}`,
      txHash: mockHash,
      from: AGENT_WALLET_ADDRESS,
      to: subAgentWallet,
      description: `Autonomous Sub-Agent Bounty: [${subAgentName}]`,
      explorerUrl: `${BASE_SEPOLIA_EXPLORER}/tx/${mockHash}`,
    };

    transactionLedger.unshift(tx);
    return tx;
  }

  static getLedger(): TreasuryTransaction[] {
    return [...transactionLedger];
  }

  static addFaucetFunds(amountEth: number = 0.02) {
    treasuryBalanceEth += amountEth;
  }
}
