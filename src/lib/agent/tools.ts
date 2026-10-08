import { payAndFetch } from '../x402/pay-fetch';
import { AgentTreasury } from '../x402/treasury';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
  run: (args: any, context?: { baseUrl?: string }) => Promise<any>;
}

export const tools: ToolDefinition[] = [
  // 1. Example: Random Joke Tool
  {
    name: 'get_joke',
    description: 'Get a random joke. Use when the user wants a joke or something funny.',
    parameters: {
      type: 'object',
      properties: {},
    },
    run: async () => {
      try {
        const res = await fetch('https://official-joke-api.appspot.com/random_joke');
        const data = await res.json();
        return {
          setup: data.setup,
          punchline: data.punchline,
          type: data.type,
        };
      } catch {
        return {
          setup: 'Why do AI agents love Base Sepolia?',
          punchline: 'Because gas fees are negligible and x402 micropayments are instant!',
        };
      }
    },
  },

  // 2. Example: Tool With Inputs (Country Info)
  {
    name: 'get_country_info',
    description: 'Get facts about a country, including its capital, population, and region.',
    parameters: {
      type: 'object',
      properties: {
        country: {
          type: 'string',
          description: 'Country name, e.g. India, Japan, France',
        },
      },
      required: ['country'],
    },
    run: async ({ country }: { country: string }) => {
      try {
        const res = await fetch(
          `https://restcountries.com/v3.1/name/${encodeURIComponent(country)}`
        );
        const [data] = await res.json();
        return {
          country: data.name?.common || country,
          capital: data.capital?.[0] || 'Unknown',
          population: (data.population || 0).toLocaleString(),
          region: data.region || 'Unknown',
          subregion: data.subregion,
          currencies: data.currencies ? Object.keys(data.currencies).join(', ') : 'N/A',
        };
      } catch (err: any) {
        return { error: `Could not retrieve information for '${country}'.`, details: err.message };
      }
    },
  },

  // 3. Dice Roll Tool (Simple free utility)
  {
    name: 'roll_dice',
    description: 'Roll a dice with a specified number of sides (e.g. 6-sided or 20-sided dice).',
    parameters: {
      type: 'object',
      properties: {
        sides: {
          type: 'number',
          description: 'Number of sides on the dice (default: 20)',
        },
      },
    },
    run: async ({ sides = 20 }: { sides?: number }) => {
      const rolled = Math.floor(Math.random() * (sides || 20)) + 1;
      return {
        sides: sides || 20,
        result: rolled,
        isCriticalHit: rolled === (sides || 20),
        isCriticalFail: rolled === 1,
      };
    },
  },

  // 4. Wallet Info Tool
  {
    name: 'get_wallet_info',
    description: "Get the agent's wallet address, network, and current balance on Base Sepolia.",
    parameters: {
      type: 'object',
      properties: {},
    },
    run: async () => {
      const state = AgentTreasury.getState();
      return {
        address: state.walletAddress,
        network: 'Base Sepolia Testnet (ChainID: 84532)',
        balanceEth: `${state.treasuryBalanceEth} ETH`,
        totalRevenueEth: `${state.totalRevenueEth} ETH`,
        explorerUrl: `https://sepolia.basescan.org/address/${state.walletAddress}`,
      };
    },
  },

  // 5. Paid Weather Tool (Uses x402 payAndFetch helper)
  {
    name: 'get_weather',
    description: 'Accesses a paid weather API and signs the required x402 micropayment using the agent wallet.',
    parameters: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: 'City name to query, e.g. Mumbai, Tokyo, London',
        },
      },
      required: ['city'],
    },
    run: async ({ city }: { city: string }, context?: { baseUrl?: string }) => {
      const base = context?.baseUrl || 'http://localhost:3000';
      const endpoint = `${base}/api/weather?city=${encodeURIComponent(city)}`;
      return payAndFetch(endpoint);
    },
  },
];
