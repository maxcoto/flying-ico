// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./BaseTest.sol";
import {FlyingICO} from "../../src/FlyingICO.sol";

contract FlyingICORedeemTest is BaseTest {
    function test_Redeem_ETH_Success() public {
        uint256 ethAmount = 1 ether;

        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        uint256 tokensToBurn = 10000e18; // Half of the tokens
        uint256 expectedAssetReturn = 0.5 ether; // Half of the ETH

        uint256 balanceBefore = user1.balance;

        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit FlyingICO__Redeemed(user1, positionId, tokensToBurn, address(0), expectedAssetReturn);

        ico.redeem(positionId, tokensToBurn);

        assertEq(user1.balance, balanceBefore + expectedAssetReturn);

        (,, uint256 assetAmount, uint256 tokenAmount,) = ico.positions(positionId);
        assertEq(tokenAmount, 10000e18);
        assertEq(assetAmount, 0.5 ether);
        assertEq(ico.backingBalances(address(0)), 0.5 ether);
        assertEq(ico.balanceOf(address(ico)), 10000e18);
    }

    function test_Redeem_ERC20_Success() public {
        uint256 usdcAmount = 1000e6;

        vm.startPrank(user1);
        usdc.approve(address(ico), usdcAmount);
        uint256 positionId = ico.depositERC20(address(usdc), usdcAmount);
        vm.stopPrank();

        uint256 tokensToBurn = 5000e18; // Half of the tokens
        uint256 expectedAssetReturn = 500e6; // Half of the USDC

        uint256 balanceBefore = usdc.balanceOf(user1);

        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit FlyingICO__Redeemed(user1, positionId, tokensToBurn, address(usdc), expectedAssetReturn);

        ico.redeem(positionId, tokensToBurn);

        assertEq(usdc.balanceOf(user1), balanceBefore + expectedAssetReturn);

        (,, uint256 assetAmount, uint256 tokenAmount,) = ico.positions(positionId);
        assertEq(tokenAmount, 5000e18);
        assertEq(assetAmount, 500e6);
    }

    function test_Redeem_AllTokens() public {
        uint256 ethAmount = 1 ether;

        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        uint256 tokensToBurn = 20000e18; // All tokens

        vm.prank(user1);
        ico.redeem(positionId, tokensToBurn);

        (,, uint256 assetAmount, uint256 tokenAmount,) = ico.positions(positionId);
        assertEq(tokenAmount, 0);
        assertEq(assetAmount, 0);
        assertEq(ico.backingBalances(address(0)), 0);
        assertEq(ico.balanceOf(address(ico)), 0);
    }

    function test_Redeem_EmitsPositionClosed_WhenFullyRedeemed() public {
        uint256 ethAmount = 1 ether;
        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        vm.prank(user1);
        vm.expectEmit(true, true, false, false);
        emit FlyingICO__PositionClosed(user1, positionId);
        ico.redeem(positionId, 20000e18);
    }

    function test_Redeem_RevertWhen_ZeroValue() public {
        uint256 ethAmount = 1 ether;

        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        vm.prank(user1);
        vm.expectRevert(FlyingICO.FlyingICO__ZeroValue.selector);
        ico.redeem(positionId, 0);
    }

    function test_Redeem_RevertWhen_NotEnoughRedeemableTokens() public {
        uint256 ethAmount = 1 ether;

        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        vm.prank(user1);
        vm.expectRevert(
            abi.encodeWithSelector(
                FlyingICO.FlyingICO__NotEnoughRedeemableTokens.selector, positionId, 20001e18, 20000e18
            )
        );
        ico.redeem(positionId, 20001e18); // More than available
    }

    function test_Redeem_RevertWhen_NotPositionOwner() public {
        uint256 ethAmount = 1 ether;

        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        // Only the position owner can redeem
        vm.prank(user2);
        vm.expectRevert(FlyingICO.FlyingICO__Unauthorized.selector);
        ico.redeem(positionId, 10000e18);
    }

    function test_Redeem_WithRounding() public {
        // Test redeem with amounts that cause rounding
        uint256 usdcAmount = 3e6; // 3 USDC = $3 USD = 30 tokens

        vm.startPrank(user1);
        usdc.approve(address(ico), usdcAmount);
        uint256 positionId = ico.depositERC20(address(usdc), usdcAmount);
        vm.stopPrank();

        // Divest 1 token (should return 0.1 USDC, but with 6 decimals = 100000)
        uint256 tokensToBurn = 1e18;

        vm.prank(user1);
        ico.redeem(positionId, tokensToBurn);

        // Position should have 29 tokens and 2.9 USDC remaining
        (,, uint256 assetAmount, uint256 tokenAmount,) = ico.positions(positionId);
        assertEq(tokenAmount, 29e18);
        // Asset amount should be approximately 2.9 USDC (with rounding)
        assertGe(assetAmount, 2900000); // At least 2.9 USDC
        assertLe(assetAmount, 3000000); // At most 3 USDC
    }

    function test_Redeem_RevertWhen_TransferFailed() public {
        // Create a user contract that rejects ETH
        RejectingUser rejectingUser = new RejectingUser();

        // Deploy a new ICO
        address[] memory acceptedAssets = new address[](1);
        acceptedAssets[0] = address(0);

        address[] memory priceFeeds = new address[](1);
        priceFeeds[0] = address(ethPriceFeed);

        uint256[] memory testFrequencies = new uint256[](1);
        testFrequencies[0] = 1 hours;

        FlyingICO testIco = new FlyingICO(
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

        // Deposit ETH from the rejecting user
        vm.deal(address(rejectingUser), 1 ether);
        vm.prank(address(rejectingUser));
        uint256 positionId = testIco.depositEther{value: 1 ether}();

        // Try to redeem - should fail because user rejects ETH
        vm.prank(address(rejectingUser));
        vm.expectRevert(FlyingICO.FlyingICO__TransferFailed.selector);
        testIco.redeem(positionId, 10000e18);
    }
}

// Contract that rejects ETH transfers
contract RejectingUser {
    receive() external payable {
        revert("Rejecting ETH");
    }

    function depositEther(address ico) external payable {
        FlyingICO(ico).depositEther{value: msg.value}();
    }

    function redeem(address ico, uint256 positionId, uint256 tokens) external {
        FlyingICO(ico).redeem(positionId, tokens);
    }
}

