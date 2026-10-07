import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NEXUS-402 // Autonomous AI Oracle & Micropayment Broker on Base Sepolia',
  description:
    'An autonomous AI agent broker operating over the x402 HTTP micropayment protocol on Base Sepolia. Features multi-agent tool orchestration, smart contract verification, and autonomous treasury management.',
  keywords: [
    'Rise In',
    'Agentmaxxing',
    'AI Agent',
    'x402',
    'Base Sepolia',
    'Coinbase AgentKit',
    'Autonomous Oracle',
    'Micropayments',
  ],
  authors: [{ name: 'Agentmaxxing Builder' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
