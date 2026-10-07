import { NextResponse } from 'next/server';
import { AgentTreasury } from '@/lib/x402/treasury';

export async function POST() {
  AgentTreasury.addFaucetFunds(0.015);
  return NextResponse.json({
    success: true,
    message: 'Added 0.015 Base Sepolia testnet ETH to agent treasury balance.',
    treasury: AgentTreasury.getState(),
  });
}
