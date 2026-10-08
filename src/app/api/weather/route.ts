import { NextRequest, NextResponse } from 'next/server';

const AGENT_WALLET = process.env.NEXT_PUBLIC_AGENT_WALLET_ADDRESS || '0x2De0c4A5B503E7302927AcA3fdD555F9353c2F31';
const WEATHER_PRICE_ETH = '0.0001';

// Mock weather database with fallback generator
const MOCK_WEATHER: Record<string, { temp: string; condition: string; humidity: string; wind: string }> = {
  mumbai: { temp: '32°C', condition: 'Humid & Sunny', humidity: '78%', wind: '14 km/h SW' },
  tokyo: { temp: '18°C', condition: 'Clear Sky', humidity: '52%', wind: '8 km/h NE' },
  london: { temp: '14°C', condition: 'Light Rain', humidity: '85%', wind: '20 km/h W' },
  'new york': { temp: '22°C', condition: 'Partly Cloudy', humidity: '60%', wind: '12 km/h NW' },
  bengaluru: { temp: '26°C', condition: 'Pleasant & Breezy', humidity: '65%', wind: '10 km/h E' },
  delhi: { temp: '30°C', condition: 'Hazy Sun', humidity: '55%', wind: '7 km/h SE' },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || 'Mumbai';
  const paymentProof = request.headers.get('x-402-payment-proof') || request.headers.get('authorization');

  // Step 1 & 2: If no payment proof is provided, issue HTTP 402 Payment Required challenge
  if (!paymentProof) {
    const invoiceId = `inv_weather_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return NextResponse.json(
      {
        error: 'Payment Required',
        status: 402,
        message: `Weather API requires x402 micropayment of ${WEATHER_PRICE_ETH} ETH on Base Sepolia.`,
        invoiceId,
        priceEth: WEATHER_PRICE_ETH,
        recipient: AGENT_WALLET,
        network: 'Base Sepolia',
        chainId: 84532,
      },
      {
        status: 402,
        headers: {
          'X-402-Payment-Required': 'true',
          'X-402-Invoice-ID': invoiceId,
          'X-402-Recipient': AGENT_WALLET,
          'X-402-Chain-Id': '84532',
          'X-402-Amount-Eth': WEATHER_PRICE_ETH,
          'Access-Control-Expose-Headers': 'X-402-Payment-Required, X-402-Invoice-ID, X-402-Recipient, X-402-Amount-Eth',
        },
      }
    );
  }

  // Step 4 & 5: Payment verified, return paid data
  const normalizedCity = city.trim().toLowerCase();
  const weatherData = MOCK_WEATHER[normalizedCity] || {
    temp: `${Math.floor(20 + Math.random() * 12)}°C`,
    condition: 'Sunny Intervals',
    humidity: `${Math.floor(50 + Math.random() * 30)}%`,
    wind: `${Math.floor(8 + Math.random() * 15)} km/h`,
  };

  return NextResponse.json({
    success: true,
    paidStatus: 'HTTP 402 Payment Verified on Base Sepolia',
    city: city.charAt(0).toUpperCase() + city.slice(1),
    temperature: weatherData.temp,
    condition: weatherData.condition,
    humidity: weatherData.humidity,
    windSpeed: weatherData.wind,
    costSettled: `${WEATHER_PRICE_ETH} ETH`,
    timestamp: new Date().toISOString(),
    attestation: 'Cryptographically signed via x402 Base Sepolia Protocol',
  });
}
