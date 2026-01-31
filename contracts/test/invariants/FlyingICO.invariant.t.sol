// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/src/Test.sol";
import {StdInvariant} from "forge-std/src/StdInvariant.sol";

import {FlyingICO} from "../../src/FlyingICO.sol";
import {MockERC20} from "../mocks/MockERC20.sol";
import {MockChainlinkPriceFeed} from "../mocks/MockChainlinkPriceFeed.sol";

contract FlyingICOHandler is Test {
    FlyingICO internal immutable ICO;
    MockERC20 internal immutable USDC;
    MockERC20 internal immutable WETH;
    MockChainlinkPriceFeed internal immutable USDC_FEED;
    MockChainlinkPriceFeed internal immutable WETH_FEED;
    MockChainlinkPriceFeed internal immutable ETH_FEED;

    address internal immutable TREASURY;
    address[] internal users;

    constructor(
        FlyingICO ico_,
        MockERC20 usdc_,
        MockERC20 weth_,
        MockChainlinkPriceFeed usdcFeed_,
        MockChainlinkPriceFeed wethFeed_,
        MockChainlinkPriceFeed ethFeed_,
        address treasury_,
        address[] memory users_
    ) {
        ICO = ico_;
        USDC = usdc_;
        WETH = weth_;
        USDC_FEED = usdcFeed_;
        WETH_FEED = wethFeed_;
        ETH_FEED = ethFeed_;
        TREASURY = treasury_;
        users = users_;
    }

    // === Actions ============================================================

    function depositERC20(uint256 userSeed, uint256 assetSeed, uint256 rawAmount) external {
        address user = users[userSeed % users.length];
        MockERC20 asset = (assetSeed % 2 == 0) ? USDC : WETH;

        uint256 max = asset.balanceOf(user);
        if (max == 0) return;

        // Keep amounts modest to avoid exhausting balances too quickly.
        uint256 amount = bound(rawAmount, 1, max);

        vm.startPrank(user);
        asset.approve(address(ICO), amount);
        ICO.depositERC20(address(asset), amount);
        vm.stopPrank();
    }

    function depositEther(uint256 userSeed, uint256 rawAmount) external {
        address user = users[userSeed % users.length];
        uint256 max = user.balance;
        if (max == 0) return;

        uint256 amount = bound(rawAmount, 1, max);

        vm.prank(user);
        ICO.depositEther{value: amount}();
    }

    function redeem(uint256 positionSeed, uint256 rawTokens) external {
        uint256 n = ICO.nextPositionId();
        if (n == 0) return;

        uint256 positionId = positionSeed % n;
        (address owner,, uint256 assetAmount, uint256 tokenAmount,) = ICO.positions(positionId);
        if (owner == address(0) || assetAmount == 0 || tokenAmount == 0) return;

        uint256 available = ICO.redeemableTokens(positionId);
        if (available == 0) return;

        uint256 tokens = bound(rawTokens, 1, available);
        vm.prank(owner);
        ICO.redeem(positionId, tokens);
    }

    function claim(uint256 positionSeed, uint256 rawTokens) external {
        uint256 n = ICO.nextPositionId();
        if (n == 0) return;

        uint256 positionId = positionSeed % n;
        (address owner,, uint256 assetAmount, uint256 tokenAmount,) = ICO.positions(positionId);
        if (owner == address(0) || assetAmount == 0 || tokenAmount == 0) return;

        uint256 tokens = bound(rawTokens, 1, tokenAmount);
        vm.prank(owner);
        ICO.claim(positionId, tokens);
    }

    function takeToTreasury(uint256 assetSeed, uint256 rawAmount) external {
        address asset = (assetSeed % 3 == 0) ? address(0) : (assetSeed % 3 == 1) ? address(USDC) : address(WETH);

        // Only attempt to take small amounts; function already enforces "excess only".
        uint256 amount = bound(rawAmount, 1, 1e18);

        // `takeAssetsToTreasury` has no access control in the implementation, but we call it as `treasury`
        // to model the intended operational flow.
        vm.prank(TREASURY);
        try ICO.takeAssetsToTreasury(asset, amount) {} catch {}
    }

    function setPrices(uint256 usdcPriceSeed, uint256 wethPriceSeed, uint256 ethPriceSeed) external {
        // keep prices strictly positive to avoid revert paths during invest
        int256 usdcPrice = int256(uint256(bound(usdcPriceSeed, 1, 2e8))); // ~$1-2
        int256 wethPrice = int256(uint256(bound(wethPriceSeed, 1, 10_000e8))); // $1..$10k
        int256 ethPrice = int256(uint256(bound(ethPriceSeed, 1, 10_000e8)));

        USDC_FEED.setRoundData(1, usdcPrice, block.timestamp, block.timestamp, 1);
        WETH_FEED.setRoundData(1, wethPrice, block.timestamp, block.timestamp, 1);
        ETH_FEED.setRoundData(1, ethPrice, block.timestamp, block.timestamp, 1);
    }
}

contract FlyingICOInvariantTest is StdInvariant, Test {
    FlyingICO internal ico;
    MockERC20 internal usdc;
    MockERC20 internal weth;
    MockChainlinkPriceFeed internal usdcFeed;
    MockChainlinkPriceFeed internal wethFeed;
    MockChainlinkPriceFeed internal ethFeed;

    address internal treasury = address(0xBEEF);
    address[] internal users;

    uint256 internal constant TOKEN_CAP = 1_000_000 * 1e18;

    FlyingICOHandler internal handler;

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        weth = new MockERC20("Wrapped Ether", "WETH", 18);

        usdcFeed = new MockChainlinkPriceFeed(8, 1e8);
        wethFeed = new MockChainlinkPriceFeed(8, 2000e8);
        ethFeed = new MockChainlinkPriceFeed(8, 2000e8);

        address[] memory acceptedAssets = new address[](3);
        acceptedAssets[0] = address(usdc);
        acceptedAssets[1] = address(weth);
        acceptedAssets[2] = address(0);

        address[] memory priceFeeds = new address[](3);
        priceFeeds[0] = address(usdcFeed);
        priceFeeds[1] = address(wethFeed);
        priceFeeds[2] = address(ethFeed);

        uint256[] memory frequencies = new uint256[](3);
        frequencies[0] = 1 hours;
        frequencies[1] = 1 hours;
        frequencies[2] = 1 hours;

        uint256 vestingStart = block.timestamp + 1 days;
        uint256 vestingEnd = block.timestamp + 30 days;

        ico = new FlyingICO(
            "Flying Token",
            "FLY",
            1_000_000,
            10,
            acceptedAssets,
            priceFeeds,
            frequencies,
            address(0),
            treasury,
            vestingStart,
            vestingEnd
        );

        users = new address[](3);
        users[0] = address(0xA11CE);
        users[1] = address(0xB0B);
        users[2] = address(0xCAFE);

        for (uint256 i = 0; i < users.length; i++) {
            // balances for both asset types
            usdc.mint(users[i], 1_000_000e6);
            weth.mint(users[i], 1_000e18);
            vm.deal(users[i], 1_000 ether);

            vm.startPrank(users[i]);
            usdc.approve(address(ico), type(uint256).max);
            weth.approve(address(ico), type(uint256).max);
            vm.stopPrank();
        }

        handler = new FlyingICOHandler(ico, usdc, weth, usdcFeed, wethFeed, ethFeed, treasury, users);
        targetContract(address(handler));
    }

    // === Invariants =========================================================

    function invariant_totalSupply_leq_cap() public view {
        assertLe(ico.totalSupply(), TOKEN_CAP);
    }

    function invariant_backing_never_exceeds_balance() public view {
        // ETH
        assertLe(ico.backingBalances(address(0)), address(ico).balance);

        // ERC20s
        assertLe(ico.backingBalances(address(usdc)), usdc.balanceOf(address(ico)));
        assertLe(ico.backingBalances(address(weth)), weth.balanceOf(address(ico)));
    }

    function invariant_backing_equals_sum_of_open_positions() public view {
        uint256 n = ico.nextPositionId();

        uint256 usdcSum;
        uint256 wethSum;
        uint256 ethSum;

        for (uint256 i = 0; i < n; i++) {
            (address owner, address asset, uint256 assetAmount, uint256 tokenAmount, uint256 vestingAmount) =
                ico.positions(i);

            // closed positions should be fully zeroed out
            if (tokenAmount == 0) {
                assertEq(assetAmount, 0);
            }

            // vestingAmount should never be below currently-locked tokenAmount
            assertGe(vestingAmount, tokenAmount);

            if (owner == address(0)) continue;
            if (asset == address(usdc)) usdcSum += assetAmount;
            else if (asset == address(weth)) wethSum += assetAmount;
            else if (asset == address(0)) ethSum += assetAmount;
        }

        assertEq(ico.backingBalances(address(usdc)), usdcSum);
        assertEq(ico.backingBalances(address(weth)), wethSum);
        assertEq(ico.backingBalances(address(0)), ethSum);
    }
}

