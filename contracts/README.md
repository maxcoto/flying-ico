# FlyingICO — Chainlink-priced on-chain raise with a built‑in Perpetual PUT

FlyingICO is a Foundry-native Solidity project that implements an **investment/ICO contract where every primary-market mint comes with a Perpetual PUT** (a right to exit back into the original asset at par), enforced fully on-chain with **explicit backing accounting** and **Chainlink USD price feeds**.

If you’re evaluating me as an engineer: this repo is opinionated about **clean invariants**, **revert-first validation**, and **tests that model real user flows** (multi-asset, vesting, redeem/claim, treasury withdrawal, fuzzing).

## What it does (product view)

- **Deposit with ETH or approved ERC20s**: Each asset is valued in USD using a configured Chainlink aggregator + freshness window.
- **Mint at a deterministic USD rate**: Mint amount is `usdValue * tokensPerUsd` with a hard total supply cap.
- **Positions, not balances**: Each investment creates a **Position** tracking:
  - deposited asset + amount (backing),
  - minted token amount (locked),
  - vesting amount (how much is still under the vesting rule).
- **Two mutually-exclusive outcomes per token**:
  - **Redeem**: burn locked tokens and **receive the original asset back** (exercising the PUT).
  - **Claim**: release tokens to the user; the PUT is forfeited and backing becomes withdrawable by treasury.
- **Vesting that reduces exit-rights over time**: redeemable tokens decrease linearly during vesting; **after vesting ends, redeemability becomes 0** (intentional “post‑vesting lock” to avoid stale/fair-price exits).

## Contracts (code map)

- `src/FlyingICO.sol`
  - ERC20 + Permit token contract
  - Deposit entrypoints: `depositEther()`, `depositERC20()`
  - PUT mechanics: `redeem(positionId, tokensToBurn)`, `claim(positionId, tokensToClaim)`
  - Treasury withdrawal for *unbacked* assets: `takeAssetsToTreasury(asset, amount)`
  - Backing + accounting: `backingBalances(asset)`, `positions(positionId)`, `positionsOf(user)`
- `src/Factory.sol`
  - `FactoryFlyingICO` to deploy configured instances (immutable params)
- `src/utils/Chainlink.sol`
  - `ChainlinkLibrary.getPrice()` with round-completeness, stale price checks, and optional L2 sequencer gating

## Quickstart

### Install + build

```bash
forge soldeer install
forge build
```

### Run the full test suite

```bash
forge test
```

This includes:
- **integration tests** for full lifecycle flows
- **edge-case tests** (zero/negative prices, rounding, ownership, caps)
- **fuzz tests** for deposit/redeem/claim/vesting behavior

## Deploy

### 1) Deploy the Factory

```bash
forge script script/DeployFactory.s.sol:DeployFactoryFlyingICO \
  --rpc-url <RPC_URL> \
  --private-key <PRIVATE_KEY> \
  --broadcast
```

### 2) Create a FlyingICO instance

Call `FactoryFlyingICO.createFlyingIco(...)` with:
- `tokenCap` (whole tokens, 18 decimals are applied internally)
- `tokensPerUsd` (whole tokens per $1, 18 decimals are applied internally)
- `acceptedAssets[]` (use `address(0)` for ETH)
- `priceFeeds[]` (Chainlink aggregators returning USD prices)
- `frequencies[]` (freshness window per asset; `0` disables stale checks)
- `treasury` (must be non-zero)
- `vestingStart`, `vestingEnd` (must be in the future and ordered)

Tip: if you want a reproducible local demo, deploy mocks and wire them up like the tests do in `test/FlyingICO/BaseTest.sol`.

## Design notes (why this is interesting)

- **Backing is explicit**: `backingBalances[asset]` is updated on deposit/redeem/claim so treasury can only withdraw *excess* assets.
- **Positions make accounting auditable**: users can have many positions across assets; exits are proportional and deterministic.
- **Vesting affects the exit-right, not just “token transferability”**: this models real “early buyer protection” while still enabling a long-term lock.
- **Reentrancy and authorization are handled in the right places**: deposit/redeem/claim/treasury-withdraw are `nonReentrant`, and position ownership is enforced.

## Security

- Implementation/security notes live in `Notes.md`.
- The tests are designed as a safety net around the system’s invariants (backing never goes negative, positions can’t be stolen, price feed failures revert, caps are enforced).

## License

MIT
