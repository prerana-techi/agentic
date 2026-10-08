/**
 * payAndFetch helper implementation
 * Handles the HTTP 402 challenge-response handshake automatically for autonomous agents
 */
export async function payAndFetch(url: string, options: RequestInit = {}): Promise<any> {
  // Step 1: Send initial probe request
  const initialRes = await fetch(url, options);

  // If endpoint is not 402, return response directly
  if (initialRes.status !== 402) {
    return initialRes.json();
  }

  // Step 2 & 3: Extract payment headers & invoice
  const invoiceId = initialRes.headers.get('X-402-Invoice-ID') || `inv_auto_${Date.now()}`;
  const amountEth = initialRes.headers.get('X-402-Amount-Eth') || '0.0001';
  const recipient = initialRes.headers.get('X-402-Recipient') || '0x2De0c4A5B503E7302927AcA3fdD555F9353c2F31';

  // Step 4: Simulate / Sign the micropayment proof from the agent's wallet
  const simulatedTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
  const paymentProofHeader = `txHash=${simulatedTxHash}; invoiceId=${invoiceId}; amount=${amountEth}; chainId=84532; recipient=${recipient}`;

  // Step 5: Retry request with signed payment proof header
  const paidRes = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'X-402-Payment-Proof': paymentProofHeader,
      'Authorization': `Bearer x402_${simulatedTxHash}`,
    },
  });

  return paidRes.json();
}
