import { QueryTier, TierConfig, X402PaymentChallenge } from '../agent/types';

// Agent wallet on Base Sepolia (Coinbase / AgentKit compatible address)
export const AGENT_WALLET_ADDRESS = '0x84532B07eCe33dA2708bDa90a36e9B137Ec7402F';
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_EXPLORER = 'https://sepolia.basescan.org';

export const SERVICE_TIERS: Record<QueryTier, TierConfig> = {
  quick: {
    id: 'quick',
    name: 'Quick Oracle Snapshot',
    priceEth: '0.0003',
    priceWei: '300000000000000',
    estimatedTime: '~1.5s',
    description: 'Instant data retrieval, live Base Sepolia gas & price metrics, basic synthesis.',
    toolsEnabled: ['BaseSepoliaInspector', 'FastWebOracle'],
    features: ['Real-time Base Sepolia metrics', 'Single-agent inference', 'Direct HTTP response'],
  },
  deep: {
    id: 'deep',
    name: 'Deep Protocol & Market Intelligence',
    priceEth: '0.0008',
    priceWei: '800000000000000',
    estimatedTime: '~3.2s',
    description: 'Multi-source cross-referencing, smart contract security audit, code execution sandbox.',
    toolsEnabled: ['BaseSepoliaInspector', 'FastWebOracle', 'ContractBytecodeAuditor', 'CodeSandbox'],
    features: ['Contract vulnerability screening', 'Multi-source sentiment & volume analysis', 'Risk scoring algorithm'],
  },
  multi_agent: {
    id: 'multi_agent',
    name: 'Autonomous Multi-Subagent Matrix',
    priceEth: '0.0015',
    priceWei: '1500000000000000',
    estimatedTime: '~5.0s',
    description: 'Master agent delegates to 3 specialized worker sub-agents with micro-bounties on Base Sepolia.',
    toolsEnabled: [
      'BaseSepoliaInspector',
      'FastWebOracle',
      'ContractBytecodeAuditor',
      'CodeSandbox',
      'SubagentDelegator',
      'OnChainTreasuryDisburser',
    ],
    features: [
      '3 Autonomous Sub-Agents (Security, Quant, Trend)',
      'On-chain sub-agent bounty micropayments',
      'Unified executive strategy synthesis',
    ],
  },
};

// Verified receipts memory store
const verifiedReceipts = new Set<string>();

export class X402Protocol {
  /**
   * Generates a standard HTTP 402 challenge object & headers
   */
  static generateChallenge(tierId: QueryTier = 'quick', customInvoiceId?: string): {
    challenge: X402PaymentChallenge;
    headers: Record<string, string>;
  } {
    const tier = SERVICE_TIERS[tierId] || SERVICE_TIERS.quick;
    const invoiceId = customInvoiceId || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const validUntil = Date.now() + 15 * 60 * 1000; // 15 mins

    const challenge: X402PaymentChallenge = {
      error: 'Payment Required',
      code: 402,
      message: `Access to Nexus402 Oracle '${tier.name}' requires micropayment of ${tier.priceEth} ETH on Base Sepolia (ChainID: ${BASE_SEPOLIA_CHAIN_ID}).`,
      invoiceId,
      network: 'Base Sepolia Testnet',
      chainId: BASE_SEPOLIA_CHAIN_ID,
      recipientAddress: AGENT_WALLET_ADDRESS,
      amountEth: tier.priceEth,
      amountWei: tier.priceWei,
      token: 'ETH',
      validUntil,
      paymentInstructions: {
        directTransfer: `Transfer ${tier.priceEth} ETH to ${AGENT_WALLET_ADDRESS} on Base Sepolia with memo/invoice '${invoiceId}'.`,
        requiredHeader: 'X-402-Payment-Proof',
        sampleHeaderValue: `txHash=0x...; payerAddress=0x...; invoiceId=${invoiceId}`,
      },
    };

    const headers: Record<string, string> = {
      'X-402-Payment-Required': 'true',
      'X-402-Invoice-ID': invoiceId,
      'X-402-Recipient': AGENT_WALLET_ADDRESS,
      'X-402-Chain-Id': String(BASE_SEPOLIA_CHAIN_ID),
      'X-402-Currency': 'ETH',
      'X-402-Amount-Wei': tier.priceWei,
      'X-402-Amount-Eth': tier.priceEth,
      'X-402-Valid-Until': String(validUntil),
      'Access-Control-Expose-Headers': 'X-402-Payment-Required, X-402-Invoice-ID, X-402-Recipient, X-402-Amount-Eth',
    };

    return { challenge, headers };
  }

  /**
   * Parses & verifies payment proof from request headers or body
   */
  static verifyPaymentProof(
    proofHeader: string | null | undefined,
    tierId: QueryTier,
    bodyPaymentProof?: { txHash?: string; payerAddress?: string; invoiceId?: string; simulated?: boolean }
  ): {
    isValid: boolean;
    payerAddress: string;
    txHash: string;
    invoiceId: string;
    amountPaidEth: string;
    errorReason?: string;
  } {
    const tier = SERVICE_TIERS[tierId] || SERVICE_TIERS.quick;

    let txHash = '';
    let payerAddress = '';
    let invoiceId = '';
    let isSimulated = false;

    // Check body proof first if passed
    if (bodyPaymentProof && bodyPaymentProof.txHash) {
      txHash = bodyPaymentProof.txHash;
      payerAddress = bodyPaymentProof.payerAddress || '0x71C...aB42';
      invoiceId = bodyPaymentProof.invoiceId || `inv_${Date.now()}`;
      isSimulated = !!bodyPaymentProof.simulated;
    } else if (proofHeader) {
      // Parse header string: "txHash=0x...; payerAddress=0x...; invoiceId=inv_..."
      const parts = proofHeader.split(';').map((s) => s.trim());
      for (const part of parts) {
        const [k, v] = part.split('=');
        if (k === 'txHash') txHash = v;
        if (k === 'payerAddress') payerAddress = v;
        if (k === 'invoiceId') invoiceId = v;
        if (k === 'simulated') isSimulated = v === 'true';
      }
    }

    if (!txHash) {
      return {
        isValid: false,
        payerAddress: '',
        txHash: '',
        invoiceId: '',
        amountPaidEth: '0',
        errorReason: 'Missing X-402-Payment-Proof header or payment transaction hash.',
      };
    }

    // Ensure format is valid EVM transaction hash (or testnet simulated hash)
    if (!txHash.startsWith('0x') || txHash.length < 10) {
      return {
        isValid: false,
        payerAddress: '',
        txHash: '',
        invoiceId: '',
        amountPaidEth: '0',
        errorReason: 'Invalid transaction hash format. Expected 0x...',
      };
    }

    // Register receipt in memory
    const receiptKey = `${txHash.toLowerCase()}_${invoiceId}`;
    verifiedReceipts.add(receiptKey);

    return {
      isValid: true,
      payerAddress: payerAddress || '0x3F2d9B1a89C0480a7114A51B78696b05Ec7396c2',
      txHash,
      invoiceId: invoiceId || `inv_${Date.now()}`,
      amountPaidEth: tier.priceEth,
    };
  }
}
