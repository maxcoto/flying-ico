# FlyingICO — Security Notes (resolved findings, invariants, and guarantees)

This document is intentionally “audit-style”: it explains what the system guarantees, what it assumes, what can go wrong, and what the test suite *actually proves* today.

## Scope

- **In scope**: `src/FlyingICO.sol`, `src/Factory.sol`, `src/utils/Chainlink.sol`
- **Out of scope**: OpenZeppelin and Chainlink dependency code (assumed correct), off-chain ops (keeper bots, UI, custody), and token economics beyond what’s enforced on-chain.

## System summary

FlyingICO is an on-chain “raise” where primary mints are paired with a Perpetual PUT:

- Users deposit accepted assets (ETH or ERC20s).
- USD value is computed via Chainlink (asset/USD feeds).
- Tokens are minted to the contract and recorded in a per-deposit **Position**.
- A position can be resolved two ways:
  - **redeem**: burn locked tokens and receive the original asset back at par (exercise the PUT)
  - **claim**: receive tokens, forfeit the PUT, and free backing for treasury sweep

The contract maintains an explicit invariant ledger (`backingBalances`) so “freed” assets are distinguishable from assets backing open puts.

## Threat model & assumptions

- **Oracle assumptions**:
  - Chainlink feeds return correct prices *most* of the time.
  - The configured “freshness window” (`frequency`) is reasonable for each asset.
  - L2 sequencer uptime feed (if configured) correctly signals downtime and grace periods.
- **Token assumptions**:
  - Accepted ERC20s behave like standard tokens (no fee-on-transfer, no rebasing) unless explicitly tested/handled.
- **Protocol assumptions**:
  - The protocol/operator chooses accepted assets and price feeds correctly at deployment.
  - Users understand vesting/lock semantics (see “Post‑vesting lock”).

## Core invariants (what should *always* be true)

The most important safety properties in FlyingICO are:

- **Backing never exceeds real balances**:
  - For each accepted asset \(A\): `backingBalances[A] <= balanceOf(contract, A)`
  - For ETH: `backingBalances[ETH] <= address(contract).balance`
- **Backing equals the sum of open position asset amounts**:
  - For each accepted asset \(A\): `backingBalances[A] == Σ positions[i].assetAmount where positions[i].asset == A`
- **Supply cap is enforced**:
  - `totalSupply <= tokenCap * 1e18`
- **Conservation within a position**:
  - When `positions[i].tokenAmount == 0`, then `positions[i].assetAmount == 0`
  - `positions[i].vestingAmount >= positions[i].tokenAmount` (vestingAmount is the “upper envelope” for vesting math)

These invariants are asserted by the stateful fuzz tests in `test/invariants/FlyingICO.invariant.t.sol`.

## Design choices with security impact

### Post‑vesting lock (intentional)

After vesting ends, `vestingRate()` returns 0, and therefore `redeemableTokens()` returns 0. This intentionally disables redeem via vesting after the vesting window ends.

- **Security rationale**: prevents “fair price / par” exits long after the raise using potentially stale assumptions.
- **Product impact**: users cannot redeem after vesting ends; only `claim()` remains (which forfeits the PUT).
- **Operational requirement**: this behavior must be *explicitly* disclosed in UI/docs.

### Positions are append-only

Positions are never deleted; a “closed” position remains in storage with zeros.

- **Risk**: unbounded position growth increases iteration costs for off-chain indexers and any future on-chain iteration you might add.
- **Mitigation**: keep all on-chain logic O(1) per action (current code does), and use events + indexers off-chain.

## Findings status (resolved)

### HIGH (resolved): `takeAssetsToTreasury()` access control

- **Fix**: `takeAssetsToTreasury()` now requires `msg.sender == _TREASURY` (reverts with `FlyingICO__Unauthorized()` otherwise).
- **Why it matters**: prevents griefing/front-running where arbitrary callers force treasury sweeps and operational timing changes.

### MEDIUM (resolved): Oracle configuration validation

- **Fix (deployment-time checks)**:
  - priceFeed must be non-zero (`FlyingICO__InvalidPriceFeed(asset, feed)`)
  - frequency must be sane (`0 < frequency <= 30 days`) (`FlyingICO__InvalidFrequency(asset, frequency)`)
  - feed decimals must be <= 18 (`FlyingICO__UnsupportedFeedDecimals(asset, decimals)`)
  - asset decimals must be <= 18 (`FlyingICO__UnsupportedAssetDecimals(asset, decimals)`)

### LOW (resolved): Dust / spam positions

- **Fix**: `_MIN_MINT_PER_POSITION = 1e18` (1 token). Deposits that would mint less revert with `FlyingICO__DepositTooSmall(tokenAmount, minTokenAmount)`.

### LOW (resolved): Missing “PositionClosed” lifecycle signal

- **Fix**: emits `FlyingICO__PositionClosed(user, positionId)` when `position.tokenAmount == 0` after exit logic.

## Verification: tests, fuzzing, and coverage

- **Unit / integration tests**: `forge test`
  - Covers deposit (ETH/ERC20), redeem/claim flows, price feed failure modes, rounding, fuzz tests for core APIs.
- **Stateful invariant fuzzing**:

```bash
forge test --match-path 'test/invariants/*'
```

- **Coverage (production code)**:

```bash
forge coverage --exclude-tests --report lcov
```

This repo is currently wired so that **all production sources included in the coverage report are at 100%** (line/function/branch), while excluding test sources.

## Remaining intentional tradeoffs (not “findings”)

- Accepted ERC20s are assumed non-rebasing and non-fee-on-transfer unless explicitly supported.
- Post-vesting redeem lock is an explicit product/security choice; define the long-term “post-vesting path” (e.g., NAV-based redemption) clearly in UX/docs.

