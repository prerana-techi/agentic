import { NextResponse } from 'next/server';
import { AgentTreasury } from '@/lib/x402/treasury';
import { SERVICE_TIERS } from '@/lib/x402/protocol';
import { AgentMemory } from '@/lib/agent/memory';
import { REGISTERED_SUBAGENTS } from '@/lib/agent/tools/subagent-delegator';

export async function GET() {
  const state = AgentTreasury.getState();
  const ledger = AgentTreasury.getLedger();
  const memory = AgentMemory.getLongTermMemory();

  return NextResponse.json({
    success: true,
    agent: state,
    tiers: SERVICE_TIERS,
    subagents: REGISTERED_SUBAGENTS,
    memoryCount: memory.length,
    recentTransactions: ledger.slice(0, 10),
    serverTime: new Date().toISOString(),
  });
}
