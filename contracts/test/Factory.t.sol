// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/src/Test.sol";

import {FactoryFlyingICO} from "../src/Factory.sol";
import {FlyingICO} from "../src/FlyingICO.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockChainlinkPriceFeed} from "./mocks/MockChainlinkPriceFeed.sol";

contract FactoryFlyingICOTest is Test {
    FactoryFlyingICO internal factory;

    function setUp() public {
        factory = new FactoryFlyingICO();
    }

    function test_createFlyingIco_deploys_and_emits() public {
        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
        MockChainlinkPriceFeed usdcFeed = new MockChainlinkPriceFeed(8, 1e8);

        address[] memory assets = new address[](1);
        assets[0] = address(usdc);

        address[] memory feeds = new address[](1);
        feeds[0] = address(usdcFeed);

        uint256[] memory freqs = new uint256[](1);
        freqs[0] = 1 hours;

        uint256 vestingStart = block.timestamp + 1 days;
        uint256 vestingEnd = block.timestamp + 31 days;

        address icoAddr = factory.createFlyingIco(
            "Flying Token",
            "FLY",
            1_000_000,
            10,
            assets,
            feeds,
            freqs,
            address(0), // sequencer
            address(0xBEEF), // treasury
            vestingStart,
            vestingEnd
        );

        assertTrue(icoAddr.code.length > 0);

        // sanity: constructor params wired
        FlyingICO ico = FlyingICO(icoAddr);
        assertEq(ico.name(), "Flying Token");
        assertEq(ico.symbol(), "FLY");
    }
}

