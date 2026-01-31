import {
  FlyingICO__Initialized,
  FlyingICO__Invested,
  FlyingICO__Divested,
  FlyingICO__Unlocked,
  // FlyingICO__BuybackAndBurn
} from "../generated/templates/FlyingICO/FlyingICO"
import { ERC20 } from "../generated/templates/FlyingICO/ERC20"
import { Asset, FlyingICO, FlyingPosition } from "../generated/schema"
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"

function getPosition(tokenId: string, positionId: BigInt): FlyingPosition {
  let id = tokenId + "-" + positionId.toString()
  let p = FlyingPosition.load(id)

  if (!p) {
    p = new FlyingPosition(id)
    p.token = tokenId
    p.positionId = positionId
    p.user = Bytes.empty()
    p.assetAmount = BigInt.zero()
    p.tokenAmount = BigInt.zero()
    p.vestingAmount = BigInt.zero()
    p.asset = Bytes.empty()

    p.isClosed = false
    p.createdAt = BigInt.zero()
    p.updatedAt = BigInt.zero()
  }

  return p
}

function getAsset(tokenId: string, assetAddress: Bytes): Asset {
  let id = tokenId + "-" + assetAddress.toHexString()
  let a = Asset.load(id)

  if (!a) {
    a = new Asset(id)
    a.ico = tokenId
    a.address = assetAddress

    if (assetAddress.toHexString() == "0x0000000000000000000000000000000000000000") {
      a.decimals = BigInt.fromI32(18)
      a.symbol = "ETH"
    } else {
      let address = Address.fromBytes(assetAddress)
      let erc20 = ERC20.bind(address)
      let decimals = BigInt.zero()
      let symbol = "-"

      let decimalsCall = erc20.try_decimals()
      if (!decimalsCall.reverted) {
        decimals = BigInt.fromI32(decimalsCall.value)
      }

      let symbolCall = erc20.try_symbol()
      if (!symbolCall.reverted) {
        symbol = symbolCall.value
      }

      a.decimals = decimals
      a.symbol = symbol
    }

    a.createdAt = BigInt.zero()
    a.updatedAt = BigInt.zero()
    a.totalAssets = BigInt.zero()
    a.backingAssets = BigInt.zero()
  }

  return a
}

export function handleFlyingInitialized(event: FlyingICO__Initialized): void {
  let tokenId = event.address.toHex()
  let token = FlyingICO.load(tokenId)

  if (token) {
    token.name = event.params.name
    token.symbol = event.params.symbol
    token.tokenCap = event.params.tokenCap
    token.tokensPerUsd = event.params.tokensPerUsd
    token.treasury = event.params.treasury
    token.vestingStart = event.params.vestingStart
    token.vestingEnd = event.params.vestingEnd
    token.updatedAt = event.block.timestamp

    let assets = event.params.acceptedAssets
    for (let i = 0; i < assets.length; i++) {
      let assetAddress = assets[i]
      let a = getAsset(tokenId, assetAddress)

      a.createdAt = event.block.timestamp
      a.updatedAt = event.block.timestamp

      a.save()
    }

    token.save()
  }
}

export function handleFlyingInvested(event: FlyingICO__Invested): void {
  let tokenId = event.address.toHex()
  let token = FlyingICO.load(tokenId)
  let pos = getPosition(tokenId, event.params.positionId)
  let asset = getAsset(tokenId, event.params.asset)

  pos.user = event.params.user
  pos.positionId = event.params.positionId
  pos.assetAmount = event.params.assetAmount
  pos.tokenAmount = event.params.tokensMinted
  pos.vestingAmount = event.params.tokensMinted
  pos.asset = event.params.asset
  pos.createdAt = event.block.timestamp
  pos.updatedAt = event.block.timestamp

  pos.save()

  if (token) {
    token.totalSupply = token.totalSupply.plus(event.params.tokensMinted)
    token.positionCount = token.positionCount.plus(BigInt.fromI32(1))
    token.updatedAt = event.block.timestamp

    token.save()
  }

  if (asset) {
    asset.totalAssets = asset.totalAssets.plus(event.params.assetAmount)
    asset.backingAssets = asset.backingAssets.plus(event.params.assetAmount)
    asset.updatedAt = event.block.timestamp

    asset.save()
  }
}

export function handleFlyingDivested(event: FlyingICO__Divested): void {
  let tokenId = event.address.toHex()
  let token = FlyingICO.load(tokenId)
  let pos = getPosition(tokenId, event.params.positionId)
  let asset = getAsset(tokenId, pos.asset)

  pos.assetAmount = pos.assetAmount.minus(event.params.assetReturnedAmount)
  pos.tokenAmount = pos.tokenAmount.minus(event.params.tokensBurned)
  pos.updatedAt = event.block.timestamp

  pos.save()

  if (token) {
    token.totalSupply = token.totalSupply.minus(event.params.tokensBurned)
    token.updatedAt = event.block.timestamp

    if (event.block.timestamp < token.vestingStart) {
        pos.vestingAmount = pos.vestingAmount.minus(event.params.tokensBurned)
    }

    token.save()
  }

  if (asset) {
    asset.backingAssets = asset.backingAssets.plus(event.params.assetReturnedAmount)
    asset.updatedAt = event.block.timestamp

    asset.save()
  }
}

export function handleFlyingUnlocked(event: FlyingICO__Unlocked): void {
  let tokenId = event.address.toHex()
  let token = FlyingICO.load(tokenId)
  let pos = getPosition(tokenId, event.params.positionId)
  let asset = getAsset(tokenId, pos.asset)

  pos.assetAmount = pos.assetAmount.minus(event.params.assetReleasedAmount)
  pos.tokenAmount = pos.tokenAmount.minus(event.params.tokensUnlocked)
  pos.updatedAt = event.block.timestamp

  pos.save()

  if (token) {
    token.tokensUnlocked = token.tokensUnlocked.plus(event.params.tokensUnlocked)
    token.updatedAt = event.block.timestamp

    if (event.block.timestamp < token.vestingStart) {
        pos.vestingAmount = pos.vestingAmount.minus(event.params.tokensUnlocked)
    }

    token.save()
  }

  if (asset) {
    asset.totalAssets = asset.totalAssets.minus(event.params.assetReleasedAmount)
    asset.updatedAt = event.block.timestamp

    asset.save()
  }
}
