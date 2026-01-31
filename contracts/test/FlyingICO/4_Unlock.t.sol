// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./BaseTest.sol";
import {FlyingICO} from "../../src/FlyingICO.sol";

contract FlyingICOClaimTest is BaseTest {
    function test_Claim_ETH_Success() public {
        uint256 ethAmount = 1 ether;

        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        uint256 tokensToClaim = 10000e18; // Half of the tokens
        uint256 expectedAssetReleased = 0.5 ether;

        uint256 balanceBefore = ico.balanceOf(user1);

        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit FlyingICO__Claimed(user1, positionId, tokensToClaim, address(0), expectedAssetReleased);

        ico.claim(positionId, tokensToClaim);

        assertEq(ico.balanceOf(user1), balanceBefore + tokensToClaim);

        (,, uint256 assetAmount, uint256 tokenAmount,) = ico.positions(positionId);
        assertEq(tokenAmount, 10000e18);
        assertEq(assetAmount, 0.5 ether);
        // Backing is reduced when unlocking - released backing becomes available for protocol
        assertEq(ico.backingBalances(address(0)), 0.5 ether);
    }

    function test_Claim_ERC20_Success() public {
        uint256 usdcAmount = 1000e6;

        vm.startPrank(user1);
        usdc.approve(address(ico), usdcAmount);
        uint256 positionId = ico.depositERC20(address(usdc), usdcAmount);
        vm.stopPrank();

        uint256 tokensToClaim = 5000e18;

        vm.prank(user1);
        ico.claim(positionId, tokensToClaim);

        assertEq(ico.balanceOf(user1), tokensToClaim);

        (,, uint256 assetAmount, uint256 tokenAmount,) = ico.positions(positionId);
        assertEq(tokenAmount, 5000e18);
        assertEq(assetAmount, 500e6);
        // Backing is reduced when unlocking - released backing becomes available for protocol
        assertEq(ico.backingBalances(address(usdc)), 500e6);
    }

    function test_Claim_AllTokens() public {
        uint256 ethAmount = 1 ether;

        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        vm.prank(user1);
        vm.expectEmit(true, true, false, false);
        emit FlyingICO__PositionClosed(user1, positionId);
        ico.claim(positionId, 20000e18);

        assertEq(ico.balanceOf(user1), 20000e18);

        (,, uint256 assetAmount, uint256 tokenAmount,) = ico.positions(positionId);
        assertEq(tokenAmount, 0);
        assertEq(assetAmount, 0);
    }

    function test_Claim_RevertWhen_ZeroValue() public {
        uint256 ethAmount = 1 ether;

        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        vm.prank(user1);
        vm.expectRevert(FlyingICO.FlyingICO__ZeroValue.selector);
        ico.claim(positionId, 0);
    }

    function test_Claim_RevertWhen_NotEnoughLockedTokens() public {
        uint256 ethAmount = 1 ether;

        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        vm.prank(user1);
        vm.expectRevert(FlyingICO.FlyingICO__NotEnoughLockedTokens.selector);
        ico.claim(positionId, 20001e18);
    }

    function test_Claim_RevertWhen_NotPositionOwner() public {
        uint256 ethAmount = 1 ether;

        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        // Only the position owner can claim
        vm.prank(user2);
        vm.expectRevert(FlyingICO.FlyingICO__Unauthorized.selector);
        ico.claim(positionId, 10000e18);
    }
}

