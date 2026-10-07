export interface MemoryItem {
  id: string;
  category: 'KNOWLEDGE' | 'LEARNED_BEHAVIOR' | 'ORACLE_CACHE' | 'RISK_PROFILE';
  title: string;
  content: string;
  relevanceScore: number;
  lastUpdated: string;
}

const longTermMemory: MemoryItem[] = [
  {
    id: 'mem_01',
    category: 'KNOWLEDGE',
    title: 'Base Sepolia Architecture & EIP-4844 Blobs',
    content: 'Base Sepolia uses OP Stack Bedrock rollups with EIP-4844 proto-danksharding blobs, reducing L1 settlement gas fees by 95%.',
    relevanceScore: 0.99,
    lastUpdated: '2026-10-07T12:00:00Z',
  },
  {
    id: 'mem_02',
    category: 'KNOWLEDGE',
    title: 'x402 Micropayment Protocol Standard',
    content: 'Standard HTTP 402 responses issue cryptographic invoices with payment recipient, token standard, and expiration. Validated via EVM transaction signatures.',
    relevanceScore: 0.98,
    lastUpdated: '2026-10-07T14:30:00Z',
  },
  {
    id: 'mem_03',
    category: 'LEARNED_BEHAVIOR',
    title: 'Autonomous Sub-Agent Budget Allocation Rule',
    content: 'When delegating tasks, allocate max 25% of incoming x402 gross query fee to specialized worker sub-agents to preserve oracle treasury margin.',
    relevanceScore: 0.95,
    lastUpdated: '2026-10-07T18:00:00Z',
  },
  {
    id: 'mem_04',
    category: 'RISK_PROFILE',
    title: 'Smart Contract Reentrancy Signature DB',
    content: 'Flag state modifications occurring after external calls lacking nonReentrant OpenZeppelin modifier on Base EVM bytecode.',
    relevanceScore: 0.92,
    lastUpdated: '2026-10-07T19:15:00Z',
  },
  {
    id: 'mem_05',
    category: 'ORACLE_CACHE',
    title: 'Coinbase Developer Platform (CDP) AgentKit Endpoints',
    content: 'CDP AgentKit v1.0.4 Base Sepolia smart contract action providers active for automated token transfer and contract deployment.',
    relevanceScore: 0.94,
    lastUpdated: '2026-10-07T20:00:00Z',
  },
];

export class AgentMemory {
  static getLongTermMemory(): MemoryItem[] {
    return [...longTermMemory];
  }

  static addMemoryItem(item: Omit<MemoryItem, 'id' | 'lastUpdated'>): MemoryItem {
    const newItem: MemoryItem = {
      ...item,
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      lastUpdated: new Date().toISOString(),
    };
    longTermMemory.unshift(newItem);
    return newItem;
  }

  static searchMemory(query: string): MemoryItem[] {
    const q = query.toLowerCase();
    return longTermMemory.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }
}
