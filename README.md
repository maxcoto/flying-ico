# Flying Protocol

**Launch DeFi products with Chainlink-priced raises and a built-in Perpetual PUT.**

Flying Protocol is a full-stack Web3 platform for token launches (ICOs) where every primary-market mint comes with a **Perpetual PUT**—the right to exit back into the original asset at par. Backing is explicit on-chain, with **Chainlink USD price feeds**, vesting, and treasury controls.

---

## What It Does

- **Deposit with ETH or ERC20** — Each asset is valued in USD via configured Chainlink aggregators.
- **Mint at a fixed USD rate** — Mint amount = `usdValue × tokensPerUsd`, with a hard supply cap.
- **Positions, not raw balances** — Each investment is a **Position** with:
  - Deposited asset and amount (backing)
  - Minted token amount (locked)
  - Vesting amount (still under the vesting rule)
- **Two outcomes per token**
  - **Redeem** — Burn locked tokens and receive the original asset back (exercise the PUT).
  - **Claim** — Release tokens to the user; the PUT is forfeited and backing can be withdrawn by treasury.
- **Vesting** — Redeemable tokens decrease linearly over time; after vesting ends, redeemability goes to zero (post-vesting lock).

The **frontend** (Flying Protocol / “Flying Vaults”) lets users connect wallets, browse and create launches, view positions, and interact with the contracts on **Sepolia testnet**.

---

## Repository Structure

| Directory    | Description |
|-------------|-------------|
| **`contracts/`** | Foundry Solidity: FlyingICO, Factory, Chainlink helpers. Tests, fuzz, and deploy scripts. |
| **`indexer/`**   | The Graph subgraph: indexes FlyingICO and Factory events on Sepolia. |
| **`frontend/`**  | Next.js 16 app: wallet connection, vault list/detail, create vault, faucet, charts. |

---

## Tech Stack

| Layer      | Technologies |
|-----------|--------------|
| **Smart contracts** | Solidity 0.8.24, Foundry, OpenZeppelin 5, Chainlink price feeds |
| **Indexer**        | The Graph (AssemblyScript), GraphQL |
| **Frontend**       | Next.js 16, React 19, Wagmi, Viem, TanStack Query, Recharts, Tailwind CSS |
| **Network**        | Ethereum Sepolia (Chain ID: 11155111) |

---

## Prerequisites

- **Node.js** 18+
- **pnpm** (or npm/yarn/bun)
- **Foundry** (for contracts): [getfoundry.sh](https://getfoundry.sh)
- **Graph CLI** (optional, for local indexer work): `npm install -g @graphprotocol/graph-cli`

---

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url>
cd flying-ico
```

Install each part:

```bash
# Contracts
cd contracts && forge install && forge build && cd ..

# Indexer (if you need to build/deploy the subgraph)
cd indexer && pnpm install && cd ..

# Frontend
cd frontend && pnpm install && cd ..
```

### 2. Smart contracts (build & test)

```bash
cd contracts
forge build
forge test
```

Tests include integration flows, edge cases, and fuzz tests for deposit/redeem/claim/vesting.

### 3. Deploy the Factory (optional)

```bash
cd contracts
forge script script/DeployFactory.s.sol:DeployFactoryFlyingICO \
  --rpc-url <RPC_URL> \
  --private-key <PRIVATE_KEY> \
  --broadcast
```

Then create a FlyingICO instance via `FactoryFlyingICO.createFlyingIco(...)` (see [contracts/README.md](contracts/README.md)).

### 4. Indexer (optional for local dev)

The frontend uses a **hosted Graph endpoint** by default. To run or deploy the subgraph yourself:

```bash
cd indexer
pnpm run codegen
pnpm run build
# Deploy to The Graph Studio (see indexer/README.md)
pnpm run deploy
```

### 5. Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env with your RPC URLs, Graph endpoint, and API keys (see below)
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000). Ensure your wallet is on **Sepolia**.

---

## Environment Variables (Frontend)

Create `frontend/.env` from `frontend/.env.example`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_VAULT_FACTORY_ADDRESS` | FactoryFlyingICO contract address on Sepolia |
| `NEXT_PUBLIC_SEPOLIA_RPC` | Sepolia RPC URL (e.g. Alchemy/Infura) |
| `NEXT_PUBLIC_MAINNET_RPC` | Mainnet RPC (optional) |
| `NEXT_PUBLIC_GRAPHQL_ENDPOINT` | The Graph API endpoint (hosted subgraph) |
| `NEXT_PUBLIC_GRAPHQL_API_KEY` | The Graph API key (if required) |
| `NEXT_PUBLIC_NETWORK_ID` | Chain ID, e.g. `11155111` for Sepolia |
| `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` | Thirdweb client ID (if used) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID (optional) |
| `ETHERSCAN_API_KEY` | For contract verification (optional) |

---

## Frontend Routes

| Route | Description |
|-------|-------------|
| `/` | Home: link to Flying Vaults |
| `/vaults` | List of Flying ICOs (vaults) from the indexer |
| `/vaults/new` | Create a new Flying ICO via the factory |
| `/vaults/[address]` | Vault detail: positions, charts, deposit/redeem/claim |
| `/faucet` | Sepolia testnet faucet for DAI, USDC, USDT (if faucet contract is deployed) |

---

## Design Highlights (Contracts)

- **Explicit backing** — `backingBalances[asset]` is updated on deposit/redeem/claim; treasury can only withdraw excess.
- **Positions** — Users can have multiple positions per asset; exits are proportional and auditable.
- **Vesting** — Affects the exit right (redeemability), not only transferability.
- **Security** — Reentrancy guards, position ownership checks, and price-feed validation (see [contracts/Notes.md](contracts/Notes.md)).

---

## Subpackages

- **[contracts/README.md](contracts/README.md)** — Contract design, invariants, deploy and test instructions.
- **[indexer/README.md](indexer/README.md)** — Subgraph schema, events, and example GraphQL queries.
- **[frontend/README.md](frontend/README.md)** — Frontend structure, tech stack, and dev server.

---

## License

- **Contracts**: [MIT](contracts/LICENSE.md)
- **Indexer**: UNLICENSED (see [indexer/package.json](indexer/package.json))
- **Frontend**: See [frontend/package.json](frontend/package.json)

---

## Links

- **App**: [flying.fund](https://www.flying.fund/)
- **Twitter**: [@flyingico](https://twitter.com/flyingico)
