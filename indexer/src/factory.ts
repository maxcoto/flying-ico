import { Factory__FlyingIcoCreated as Factory__FlyingIcoCreatedEvent } from "../generated/FactoryFlyingICO/FactoryFlyingICO"
import { FlyingICO as FlyingICOTemplate } from "../generated/templates"
import { FactoryFlyingICO, FlyingICO } from "../generated/schema"
import { BigInt, Bytes } from "@graphprotocol/graph-ts"

export function handleFactory__FlyingIcoCreated(
  event: Factory__FlyingIcoCreatedEvent
): void {
  let factory = FactoryFlyingICO.load(event.address.toHex())

  if (!factory) {
    factory = new FactoryFlyingICO(event.address.toHex())

    factory.icoCount = BigInt.zero()
    factory.blockNumber = event.block.number
    factory.blockTimestamp = event.block.timestamp
    factory.transactionHash = event.transaction.hash
  }

  factory.icoCount = factory.icoCount.plus(BigInt.fromI32(1))
  factory.save()

  let icoAddress = event.params.flyingIco.toHex()
  let ico = new FlyingICO(icoAddress)

  ico.factory = factory.id
  ico.name = "-"
  ico.symbol = "-"
  ico.treasury = Bytes.empty()
  ico.vestingStart = BigInt.zero()
  ico.vestingEnd = BigInt.zero()
  ico.tokenCap = BigInt.zero()
  ico.tokensPerUsd = BigInt.zero()
  ico.positionCount = BigInt.zero()
  ico.totalSupply = BigInt.zero()

  ico.createdAt = event.block.timestamp
  ico.updatedAt = event.block.timestamp

  ico.save()

  FlyingICOTemplate.create(event.params.flyingIco)
}
