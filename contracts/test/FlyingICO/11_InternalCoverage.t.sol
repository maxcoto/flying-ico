// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/src/Test.sol";

import {FlyingICO} from "../../src/FlyingICO.sol";
import {MockERC20} from "../mocks/MockERC20.sol";
import {MockChainlinkPriceFeed} from "../mocks/MockChainlinkPriceFeed.sol";

/// @dev Exposes selected internal paths for coverage-only tests.
contract FlyingICOHarness is FlyingICO {
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 tokenCap_,
        uint256 tokensPerUsd_,
        address[] memory acceptedAssets_,
        address[] memory priceFeeds_,
        uint256[] memory frequencies_,
        address sequencer_,
        address treasury_,
        uint256 vestingStart_,
        uint256 vestingEnd_
    )
        FlyingICO(
            name_,
            symbol_,
            tokenCap_,
            tokensPerUsd_,
            acceptedAssets_,
            priceFeeds_,
            frequencies_,
            sequencer_,
            treasury_,
            vestingStart_,
            vestingEnd_
        )
    {}

    function exposedComputeTokenAmount(address asset, uint256 assetAmount) external view returns (uint256) {
        return _computeTokenAmount(asset, assetAmount);
    }

    function exposedComputeAssetAmount(uint256 positionId, uint256 tokenAmount) external view returns (uint256) {
        return _computeAssetAmount(positionId, tokenAmount);
    }

    function exposedSetPosition(uint256 positionId, Position calldata p) external {
        positions[positionId] = p;
    }

    function exposedSetBacking(address asset, uint256 amount) external {
        backingBalances[asset] = amount;
    }
}

contract FlyingICOInternalCoverageTest is Test {
    address internal constant TREASURY = address(0xBEEF);

    function _deployHarness(
        uint256 tokensPerUsd,
        address asset,
        address feed,
        uint8 feedDecimals,
        int256 feedPrice
    ) internal returns (FlyingICOHarness h) {
        // Use the deployed feed/asset; also mutate feed answer if requested.
        if (feed != address(0)) {
            MockChainlinkPriceFeed(feed).setRoundData(1, feedPrice, block.timestamp, block.timestamp, 1);
        } else {
            MockChainlinkPriceFeed pf = new MockChainlinkPriceFeed(feedDecimals, feedPrice);
            feed = address(pf);
        }

        address[] memory assets = new address[](1);
        assets[0] = asset;
        address[] memory feeds = new address[](1);
        feeds[0] = feed;
        uint256[] memory freqs = new uint256[](1);
        freqs[0] = 1 hours;

        uint256 vestingStart = block.timestamp + 1 days;
        uint256 vestingEnd = block.timestamp + 30 days;

        h = new FlyingICOHarness(
            "Flying Token",
            "FLY",
            1_000_000,
            tokensPerUsd,
            assets,
            feeds,
            freqs,
            address(0),
            TREASURY,
            vestingStart,
            vestingEnd
        );
    }

    function test_constructor_revert_invalidVestingSchedule_startInPast() public {
        MockERC20 asset = new MockERC20("Asset", "AST", 18);
        MockChainlinkPriceFeed feed = new MockChainlinkPriceFeed(8, 1e8);

        address[] memory assets = new address[](1);
        assets[0] = address(asset);
        address[] memory feeds = new address[](1);
        feeds[0] = address(feed);
        uint256[] memory freqs = new uint256[](1);
        freqs[0] = 1 hours;

        uint256 nowTs = block.timestamp;
        uint256 vestingStart = nowTs - 1;
        uint256 vestingEnd = nowTs + 1 days;

        vm.expectRevert(abi.encodeWithSelector(FlyingICO.FlyingICO__InvalidVestingSchedule.selector, nowTs, vestingStart, vestingEnd));
        new FlyingICO(
            "Flying Token",
            "FLY",
            1_000_000,
            10,
            assets,
            feeds,
            freqs,
            address(0),
            TREASURY,
            vestingStart,
            vestingEnd
        );
    }

    function test_computeTokenAmount_revert_zeroUsdValue() public {
        // Set up a case where USD value floors to 0:
        // usdValue = assetAmount * (price * 1e18) / (assetUnits * feedUnits)
        // Use: assetUnits=1e18, feedUnits=1e18, price=1 -> usdValue = assetAmount * 1e18 / 1e36.
        // With assetAmount=1, this becomes 0.
        MockERC20 asset = new MockERC20("Asset", "AST", 18);
        MockChainlinkPriceFeed feed = new MockChainlinkPriceFeed(18, 1);

        FlyingICOHarness h = _deployHarness(10, address(asset), address(feed), 18, 1);

        vm.expectRevert(FlyingICO.FlyingICO__ZeroUsdValue.selector);
        h.exposedComputeTokenAmount(address(asset), 1);
    }

    function test_invest_revert_zeroTokenAmount_when_tokensPerUsd_isZero() public {
        MockERC20 asset = new MockERC20("Asset", "AST", 18);
        MockChainlinkPriceFeed feed = new MockChainlinkPriceFeed(8, 1e8);

        FlyingICOHarness h = _deployHarness(0, address(asset), address(feed), 8, 1e8);

        asset.mint(address(this), 1e18);
        asset.approve(address(h), 1e18);

        vm.expectRevert(FlyingICO.FlyingICO__ZeroTokenAmount.selector);
        h.depositERC20(address(asset), 1e18);
    }

    function test_computeAssetAmount_revert_positionTokenAmountZero() public {
        MockERC20 asset = new MockERC20("Asset", "AST", 18);
        MockChainlinkPriceFeed feed = new MockChainlinkPriceFeed(8, 1e8);
        FlyingICOHarness h = _deployHarness(10, address(asset), address(feed), 8, 1e8);

        h.exposedSetPosition(
            0,
            FlyingICO.Position({
                user: address(this),
                asset: address(asset),
                assetAmount: 1,
                tokenAmount: 0,
                vestingAmount: 0
            })
        );

        vm.expectRevert(FlyingICO.FlyingICO__ZeroTokenAmount.selector);
        h.exposedComputeAssetAmount(0, 1);
    }

    function test_computeAssetAmount_revert_assetAmountFloorsToZero() public {
        MockERC20 asset = new MockERC20("Asset", "AST", 18);
        MockChainlinkPriceFeed feed = new MockChainlinkPriceFeed(8, 1e8);
        FlyingICOHarness h = _deployHarness(10, address(asset), address(feed), 8, 1e8);

        h.exposedSetPosition(
            0,
            FlyingICO.Position({
                user: address(this),
                asset: address(asset),
                assetAmount: 1,
                tokenAmount: 1e18,
                vestingAmount: 1e18
            })
        );

        vm.expectRevert(FlyingICO.FlyingICO__ZeroValue.selector);
        h.exposedComputeAssetAmount(0, 1);
    }

    function test_computeAssetAmount_revert_when_tokenAmount_exceeds_positionTokenAmount() public {
        MockERC20 asset = new MockERC20("Asset", "AST", 18);
        MockChainlinkPriceFeed feed = new MockChainlinkPriceFeed(8, 1e8);
        FlyingICOHarness h = _deployHarness(10, address(asset), address(feed), 8, 1e8);

        h.exposedSetPosition(
            0,
            FlyingICO.Position({
                user: address(this),
                asset: address(asset),
                assetAmount: 100,
                tokenAmount: 10,
                vestingAmount: 10
            })
        );
        h.exposedSetBacking(address(asset), 100);

        vm.expectRevert(FlyingICO.FlyingICO__InsufficientAssetAmount.selector);
        h.exposedComputeAssetAmount(0, 20);
    }

    function test_computeAssetAmount_revert_when_backingInsufficient() public {
        MockERC20 asset = new MockERC20("Asset", "AST", 18);
        MockChainlinkPriceFeed feed = new MockChainlinkPriceFeed(8, 1e8);
        FlyingICOHarness h = _deployHarness(10, address(asset), address(feed), 8, 1e8);

        h.exposedSetPosition(
            0,
            FlyingICO.Position({
                user: address(this),
                asset: address(asset),
                assetAmount: 100,
                tokenAmount: 10,
                vestingAmount: 10
            })
        );
        h.exposedSetBacking(address(asset), 49);

        vm.expectRevert(FlyingICO.FlyingICO__InsufficientBacking.selector);
        h.exposedComputeAssetAmount(0, 5); // would compute 50
    }

    function test_constructor_revert_invalidFrequency_zero() public {
        MockERC20 asset = new MockERC20("Asset", "AST", 18);
        MockChainlinkPriceFeed feed = new MockChainlinkPriceFeed(8, 1e8);

        address[] memory assets = new address[](1);
        assets[0] = address(asset);
        address[] memory feeds = new address[](1);
        feeds[0] = address(feed);
        uint256[] memory freqs = new uint256[](1);
        freqs[0] = 0;

        uint256 vestingStart = block.timestamp + 1 days;
        uint256 vestingEnd = block.timestamp + 30 days;

        vm.expectRevert(abi.encodeWithSelector(FlyingICO.FlyingICO__InvalidFrequency.selector, address(asset), 0));
        new FlyingICO("Flying Token", "FLY", 1_000_000, 10, assets, feeds, freqs, address(0), TREASURY, vestingStart, vestingEnd);
    }

    function test_constructor_revert_invalidPriceFeed_zero() public {
        MockERC20 asset = new MockERC20("Asset", "AST", 18);

        address[] memory assets = new address[](1);
        assets[0] = address(asset);
        address[] memory feeds = new address[](1);
        feeds[0] = address(0);
        uint256[] memory freqs = new uint256[](1);
        freqs[0] = 1 hours;

        uint256 vestingStart = block.timestamp + 1 days;
        uint256 vestingEnd = block.timestamp + 30 days;

        vm.expectRevert(abi.encodeWithSelector(FlyingICO.FlyingICO__InvalidPriceFeed.selector, address(asset), address(0)));
        new FlyingICO("Flying Token", "FLY", 1_000_000, 10, assets, feeds, freqs, address(0), TREASURY, vestingStart, vestingEnd);
    }

    function test_constructor_revert_unsupportedFeedDecimals() public {
        MockERC20 asset = new MockERC20("Asset", "AST", 18);
        MockChainlinkPriceFeed feed = new MockChainlinkPriceFeed(19, 1e8);

        address[] memory assets = new address[](1);
        assets[0] = address(asset);
        address[] memory feeds = new address[](1);
        feeds[0] = address(feed);
        uint256[] memory freqs = new uint256[](1);
        freqs[0] = 1 hours;

        uint256 vestingStart = block.timestamp + 1 days;
        uint256 vestingEnd = block.timestamp + 30 days;

        vm.expectRevert(abi.encodeWithSelector(FlyingICO.FlyingICO__UnsupportedFeedDecimals.selector, address(asset), uint8(19)));
        new FlyingICO("Flying Token", "FLY", 1_000_000, 10, assets, feeds, freqs, address(0), TREASURY, vestingStart, vestingEnd);
    }

    function test_constructor_revert_unsupportedAssetDecimals() public {
        MockERC20 asset = new MockERC20("Asset", "AST", 19);
        MockChainlinkPriceFeed feed = new MockChainlinkPriceFeed(8, 1e8);

        address[] memory assets = new address[](1);
        assets[0] = address(asset);
        address[] memory feeds = new address[](1);
        feeds[0] = address(feed);
        uint256[] memory freqs = new uint256[](1);
        freqs[0] = 1 hours;

        uint256 vestingStart = block.timestamp + 1 days;
        uint256 vestingEnd = block.timestamp + 30 days;

        vm.expectRevert(abi.encodeWithSelector(FlyingICO.FlyingICO__UnsupportedAssetDecimals.selector, address(asset), uint8(19)));
        new FlyingICO("Flying Token", "FLY", 1_000_000, 10, assets, feeds, freqs, address(0), TREASURY, vestingStart, vestingEnd);
    }

    function test_depositEther_revert_depositTooSmall() public {
        MockChainlinkPriceFeed feed = new MockChainlinkPriceFeed(8, 2000e8);

        address[] memory assets = new address[](1);
        assets[0] = address(0);
        address[] memory feeds = new address[](1);
        feeds[0] = address(feed);
        uint256[] memory freqs = new uint256[](1);
        freqs[0] = 1 hours;

        uint256 vestingStart = block.timestamp + 1 days;
        uint256 vestingEnd = block.timestamp + 30 days;

        FlyingICO tiny = new FlyingICO("Tiny", "TNY", 1_000_000, 10, assets, feeds, freqs, address(0), TREASURY, vestingStart, vestingEnd);

        vm.expectRevert(abi.encodeWithSelector(FlyingICO.FlyingICO__DepositTooSmall.selector, uint256(20000), uint256(1e18)));
        tiny.depositEther{value: 1 wei}();
    }
}

