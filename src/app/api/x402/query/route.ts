import { NextRequest, NextResponse } from 'next/server';
import { X402Protocol, SERVICE_TIERS } from '@/lib/x402/protocol';
import { AgentCore } from '@/lib/agent/agent-core';
import { QueryTier } from '@/lib/agent/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = body.query || 'Evaluate Base Sepolia ecosystem liquidity and smart contract security';
    const tierId: QueryTier = (body.tier as QueryTier) || 'deep';

    // Check for HTTP 402 payment proof from headers or request body
    const proofHeader = req.headers.get('x-402-payment-proof');
    const bodyProof = body.paymentProof;

    // Verify payment proof
    const verification = X402Protocol.verifyPaymentProof(proofHeader, tierId, bodyProof);

    // If no valid payment provided, respond with HTTP 402 Payment Required!
    if (!verification.isValid) {
      const { challenge, headers } = X402Protocol.generateChallenge(tierId, body.invoiceId);

      return NextResponse.json(challenge, {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });
    }

    // Payment is verified! Execute Autonomous Agent Pipeline
    const agentResult = await AgentCore.executeQuery(query, tierId, {
      payerAddress: verification.payerAddress,
      txHash: verification.txHash,
      invoiceId: verification.invoiceId,
      amountPaidEth: verification.amountPaidEth,
    });

    return NextResponse.json(
      {
        success: true,
        receipt: {
          status: 'FULFILLED',
          invoiceId: verification.invoiceId,
          amountPaidEth: verification.amountPaidEth,
          paymentTxHash: verification.txHash,
          token: 'X402_FULFILLMENT_RECEIPT',
        },
        data: agentResult,
      },
      {
        status: 200,
        headers: {
          'X-402-Status': 'FULFILLED',
          'X-402-Invoice-ID': verification.invoiceId,
          'X-402-Receipt-Token': `rcpt_${verification.txHash.slice(0, 16)}`,
        },
      }
    );
  } catch (error: any) {
    console.error('Error handling x402 query:', error);
    return NextResponse.json(
      {
        error: 'Internal Agentic Pipeline Error',
        message: error?.message || 'Failed to process agent request',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const tierParam = (req.nextUrl.searchParams.get('tier') as QueryTier) || 'quick';
  const { challenge, headers } = X402Protocol.generateChallenge(tierParam);

  return NextResponse.json(challenge, {
    status: 402,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}
