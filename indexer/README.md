# STAK Vault Subgraph

A [Graph Protocol](https://thegraph.com/) subgraph for indexing STAK ecosystem smart contracts on Ethereum Sepolia testnet.

## Overview

This subgraph indexes events from the STAK ecosystem, which consists of two main components:

1. **FlyingICO** - Investment vaults with performance fees and vesting mechanisms
2. **FlyingICO** - Token launch platform with vesting and multi-asset support

## Indexed Contracts

### Factory Contracts
- **FactoryFlyingICO**: `0x4A9403D922D33422ac8d961dA9CCDbAa0031c327` (Block: 9797827)
- **FactoryFlyingICO**: `0x85E999BDA865602232af835ACc2806A5b77a99e2` (Block: 9799045)

### Network
- **Ethereum Sepolia Testnet**

## Entities

### FlyingICO Entities

#### FactoryFlyingICO
- Tracks vault creation and total vault count
- Links to all created FlyingICO instances

#### FlyingICO
- Investment vault with asset management
- Tracks total assets, invested assets, and performance fees
- Supports vesting periods and redeems at NAV
- Links to user positions

#### FlyingPosition
- Individual user positions within vaults
- Tracks asset/share amounts, burns, unlocks, and releases
- Maintains position lifecycle status

### FlyingICO Entities

#### FactoryFlyingICO
- Tracks token creation and total token count
- Links to all created FlyingICO instances

#### FlyingICO
- Token launch platform with configurable parameters
- Supports multiple assets and vesting mechanisms
- Tracks total assets and token metrics

#### FlyingPosition
- Individual user positions within token launches
- Tracks asset amounts, token amounts, and vesting

## Indexed Events

### FlyingICO Events


### FlyingICO Events
- `Factory__FlyingIcoCreated` - New token launch creation
- `FlyingICO__Initialized` - Token launch initialization
- `FlyingICO__Deposited` - User investments in token launches
- `FlyingICO__Redeemed` - User divestments from token launches
- `FlyingICO__Claimed` - Token vesting unlocks

## Development

### Prerequisites
- Node.js
- Yarn
- Graph CLI

### Setup

1. Install graph-cli:
```bash
npm install -g @graphprotocol/graph-cli
```

2. Initialize:
```bash
graph init-protocol
```

3. Authenticate and Deploy:
```bash
graph auth <YOUR_KEY>
graph codegen && graph build
graph deploy <YOUR_SUBGRAPH_STUDIO>
```

## GraphQL Schema

The subgraph exposes a GraphQL API with the following main query capabilities:

- Query vaults and their positions
- Query token launches and investments
- Filter by user addresses, vault addresses, or time ranges
- Aggregate data across the ecosystem

### Example Queries

#### Get all FlyingICOs
```graphql
{
  flyingICO {
    id
    name
    symbol
    totalAssets
    investedAssets
    positionCount
    positions {
      user
      assetAmount
      shareAmount
      isClosed
    }
  }
}
```

#### Get user positions
```graphql
{
  flyingPositions(where: { user: "0x..." }) {
    id
    vault {
      name
      symbol
    }
    assetAmount
    shareAmount
    isClosed
  }
}
```

#### Get FlyingICO launches
```graphql
{
  flyingICOs {
    id
    name
    symbol
    tokenCap
    tokensPerUsd
    totalAssets
    positionCount
  }
}
```

## Architecture

The subgraph uses a factory pattern where:
1. Factory contracts emit creation events for new vaults/tokens
2. Dynamic data sources are created for each new instance
3. Individual contract events are indexed to track state changes
4. Relationships between entities are maintained through GraphQL schema

## License

UNLICENSED