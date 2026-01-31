// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./BaseTest.sol";
import {FlyingICO} from "../../src/FlyingICO.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

contract FlyingICODepositERC20Test is BaseTest {
    function test_DepositERC20_USDC_Success() public {
        uint256 usdcAmount = 1000e6; // 1000 USDC = $1000 USD
        // Expected tokens: $1000 * 10 tokens/USD = 10000 tokens

        vm.startPrank(user1);
        usdc.approve(address(ico), usdcAmount);

        vm.expectEmit(true, true, false, true);
        emit FlyingICO__Deposited(user1, 0, address(usdc), usdcAmount, 10000e18);

        uint256 positionId = ico.depositERC20(address(usdc), usdcAmount);
        vm.stopPrank();

        assertEq(positionId, 0);

        (address user, address asset, uint256 assetAmount, uint256 tokenAmount,) = ico.positions(positionId);
        assertEq(user, user1);
        assertEq(asset, address(usdc));
        assertEq(assetAmount, usdcAmount);
        assertEq(tokenAmount, 10000e18);

        assertEq(ico.backingBalances(address(usdc)), usdcAmount);
        assertEq(usdc.balanceOf(address(ico)), usdcAmount);
        assertEq(ico.balanceOf(address(ico)), 10000e18);
    }

    function test_DepositERC20_WETH_Success() public {
        uint256 wethAmount = 1e18; // 1 WETH = $2000 USD
        // Expected tokens: $2000 * 10 tokens/USD = 20000 tokens

        vm.startPrank(user1);
        weth.approve(address(ico), wethAmount);

        vm.expectEmit(true, true, false, true);
        emit FlyingICO__Deposited(user1, 0, address(weth), wethAmount, 20000e18);

        uint256 positionId = ico.depositERC20(address(weth), wethAmount);
        vm.stopPrank();

        assertEq(positionId, 0);
        assertEq(ico.backingBalances(address(weth)), wethAmount);
        assertEq(weth.balanceOf(address(ico)), wethAmount);
    }

    function test_DepositERC20_RevertWhen_ZeroValue() public {
        vm.startPrank(user1);
        usdc.approve(address(ico), 0);
        vm.expectRevert(FlyingICO.FlyingICO__ZeroValue.selector);
        ico.depositERC20(address(usdc), 0);
        vm.stopPrank();
    }

    function test_DepositERC20_RevertWhen_AssetNotAccepted() public {
        MockERC20 invalidToken = new MockERC20("Invalid", "INV", 18);

        vm.startPrank(user1);
        invalidToken.mint(user1, 1000e18);
        invalidToken.approve(address(ico), 1000e18);
        vm.expectRevert(abi.encodeWithSelector(FlyingICO.FlyingICO__AssetNotAccepted.selector, address(invalidToken)));
        ico.depositERC20(address(invalidToken), 1000e18);
        vm.stopPrank();
    }

    function test_DepositERC20_RevertWhen_NoPriceFeed() public {
        // Deploy ICO without a price feed for an asset should now revert in the constructor
        address[] memory acceptedAssets = new address[](1);
        acceptedAssets[0] = address(usdc);

        address[] memory priceFeeds = new address[](1);
        priceFeeds[0] = address(0); // No price feed

        uint256[] memory testFrequencies = new uint256[](1);
        testFrequencies[0] = 1 hours;

        vm.expectRevert(abi.encodeWithSelector(FlyingICO.FlyingICO__InvalidPriceFeed.selector, address(usdc), address(0)));
        new FlyingICO(
            "Test",
            "TEST",
            TOKEN_CAP,
            TOKENS_PER_USD,
            acceptedAssets,
            priceFeeds,
            testFrequencies,
            sequencer,
            treasury,
            vestingStart,
            vestingEnd
        );
    }

    function test_DepositERC20_RevertWhen_ZeroUsdValue() public {
        // Set price to 0
        usdcPriceFeed.setPrice(0);

        vm.startPrank(user1);
        usdc.approve(address(ico), 1000e6);
        // ChainlinkLibrary will revert with ChainlinkLibrary__InvalidPrice first
        vm.expectRevert(); // ChainlinkLibrary__InvalidPrice, not FlyingICO__ZeroUsdValue
        ico.depositERC20(address(usdc), 1000e6);
        vm.stopPrank();
    }

    function test_DepositERC20_RevertWhen_InsufficientAllowance() public {
        vm.startPrank(user1);
        usdc.approve(address(ico), 100e6);
        vm.expectRevert(); // ERC20 insufficient allowance
        ico.depositERC20(address(usdc), 1000e6);
        vm.stopPrank();
    }
}

