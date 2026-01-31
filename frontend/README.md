# Flying Protocol Frontend

A modern web3 application for launching and managing Flying Vaults.

## Features

- **Wallet Connection**: Connect using MetaMask, WalletConnect, or injected wallets
- **Flying Vaults**: Create and manage yield-generating vaults with performance fees
- **Data Visualization**: Interactive charts showing token distribution, vesting schedules, and utilization rates
- **Position Management**: View and manage your positions in ICOs and vaults
- **Real-time Data**: Fetches data from The Graph indexer

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

```bash
pnpm install
```

### Environment Variables

Create an `.env` file in the root directory by copying it from `.env.example`

**Note:** The application is configured to run on **Sepolia Testnet** (Chain ID: 11155111). Make sure your wallet is connected to Sepolia testnet when using the application.

### Running the Development Server

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `/app` - Next.js app router pages and layouts
  - `/vaults` - Flying Vault list page
  - `/vaults/[address]` - Flying Vault detail page with charts
  - `/vaults/new` - Create new Flying Vault form
- `/components` - Reusable React components
- `/lib` - Utilities and configurations
  - `graphql.ts` - GraphQL client and queries
  - `wagmi.ts` - Wagmi configuration for wallet connections
- `/app/abis` - Contract ABIs for interactions

## Technologies

- **Next.js 16** - React framework
- **Wagmi** - React Hooks for Ethereum
- **Viem** - TypeScript Ethereum library
- **Recharts** - Charting library
- **GraphQL Request** - GraphQL client
- **Tailwind CSS** - Styling

## GraphQL Indexer

The application uses The Graph indexer at:
- Endpoint: `https://api.studio.thegraph.com/query/zzzzz/flying-protocol/version/latest`
- API Key: Configured in `lib/graphql.ts`

