// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./BaseTest.sol";

/**
 * @title FlyingICORedeemableTokensTest
 * @dev Tests for the redeemableTokens function, including recent changes that account
 *      for tokens already redeemed or claimed (takenTokens calculation)
 */
contract FlyingICORedeemableTokensTest is BaseTest {
    function test_RedeemableTokens_AfterPartialRedeem_BeforeVesting() public {
        uint256 ethAmount = 1 ether;
        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        // Initially, all tokens should be redeemable
        uint256 initialRedeemable = ico.redeemableTokens(positionId);
        (,,,, uint256 vestingAmount) = ico.positions(positionId);
        assertEq(initialRedeemable, vestingAmount); // 20000e18

        // Redeem half of the tokens
        uint256 tokensToRedeem = 10000e18;
        vm.prank(user1);
        ico.redeem(positionId, tokensToRedeem);

        // After redeem, redeemable should be reduced
        uint256 redeemableAfter = ico.redeemableTokens(positionId);
        (,,, uint256 tokenAmountAfter,) = ico.positions(positionId);
        
        // Redeemable should equal remaining tokens (since before vesting)
        assertEq(redeemableAfter, tokenAmountAfter);
        assertEq(redeemableAfter, 10000e18);
    }

    function test_RedeemableTokens_AfterPartialClaim_BeforeVesting() public {
        uint256 ethAmount = 1 ether;
        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        // Initially, all tokens should be redeemable
        uint256 initialRedeemable = ico.redeemableTokens(positionId);
        (,,,, uint256 vestingAmount) = ico.positions(positionId);
        assertEq(initialRedeemable, vestingAmount);

        // Claim half of the tokens
        uint256 tokensToClaim = 10000e18;
        vm.prank(user1);
        ico.claim(positionId, tokensToClaim);

        // After claim, redeemable should be reduced
        uint256 redeemableAfter = ico.redeemableTokens(positionId);
        (,,, uint256 tokenAmountAfter,) = ico.positions(positionId);
        
        // Redeemable should equal remaining tokens (since before vesting)
        assertEq(redeemableAfter, tokenAmountAfter);
        assertEq(redeemableAfter, 10000e18);
    }

    function test_RedeemableTokens_AfterRedeemAndClaim_BeforeVesting() public {
        uint256 ethAmount = 1 ether;
        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        // Redeem some tokens
        vm.prank(user1);
        ico.redeem(positionId, 5000e18);

        // Claim some tokens
        vm.prank(user1);
        ico.claim(positionId, 5000e18);

        // Check redeemable after both operations
        uint256 redeemableAfter = ico.redeemableTokens(positionId);
        (,,, uint256 tokenAmountAfter,) = ico.positions(positionId);
        
        // Should equal remaining tokens
        assertEq(redeemableAfter, tokenAmountAfter);
        assertEq(redeemableAfter, 10000e18);
    }

    function test_RedeemableTokens_AfterPartialRedeem_DuringVesting() public {
        uint256 ethAmount = 1 ether;
        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        // Move to middle of vesting period
        vm.warp(vestingStart + 15 days);

        // Get initial redeemable (should be less than vestingAmount due to vesting)
        uint256 initialRedeemable = ico.redeemableTokens(positionId);
        (,,,, uint256 vestingAmount) = ico.positions(positionId);
        assertLt(initialRedeemable, vestingAmount);
        assertGt(initialRedeemable, 0);

        // Redeem half of the redeemable tokens
        uint256 tokensToRedeem = initialRedeemable / 2;
        vm.prank(user1);
        ico.redeem(positionId, tokensToRedeem);

        // After redeem, redeemable should be reduced
        uint256 redeemableAfter = ico.redeemableTokens(positionId);
        
        // Should be approximately half of initial (accounting for rounding)
        assertLe(redeemableAfter, initialRedeemable - tokensToRedeem);
        assertGt(redeemableAfter, 0);
    }

    function test_RedeemableTokens_AfterPartialClaim_DuringVesting() public {
        uint256 ethAmount = 1 ether;
        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        // Move to middle of vesting period
        vm.warp(vestingStart + 15 days);

        // Get initial redeemable
        uint256 initialRedeemable = ico.redeemableTokens(positionId);
        assertGt(initialRedeemable, 0);

        // Claim some tokens (any amount up to locked tokenAmount is allowed)
        uint256 tokensToClaim = initialRedeemable / 2;
        vm.prank(user1);
        ico.claim(positionId, tokensToClaim);

        // After claim, redeemable should be reduced
        uint256 redeemableAfter = ico.redeemableTokens(positionId);
        
        // Should be less than initial
        assertLt(redeemableAfter, initialRedeemable);
        assertGt(redeemableAfter, 0);
    }

    function test_RedeemableTokens_AfterAllTokensRedeemed() public {
        uint256 ethAmount = 1 ether;
        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        // Redeem all tokens
        vm.prank(user1);
        ico.redeem(positionId, 20000e18);

        // After all tokens redeemed, redeemable should be 0
        uint256 redeemableAfter = ico.redeemableTokens(positionId);
        assertEq(redeemableAfter, 0);
    }

    function test_RedeemableTokens_AfterAllTokensClaimed() public {
        uint256 ethAmount = 1 ether;
        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        // Claim all tokens
        vm.prank(user1);
        ico.claim(positionId, 20000e18);

        // After all tokens claimed, redeemable should be 0
        uint256 redeemableAfter = ico.redeemableTokens(positionId);
        assertEq(redeemableAfter, 0);
    }

    function test_RedeemableTokens_AfterVestingEnds() public {
        uint256 ethAmount = 1 ether;
        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        // Move after vesting ends
        vm.warp(vestingEnd + 1 days);

        // After vesting ends, redeemable should be 0
        uint256 redeemable = ico.redeemableTokens(positionId);
        assertEq(redeemable, 0);
    }

    function test_RedeemableTokens_AfterVestingEnds_WithPartialRedeem() public {
        uint256 ethAmount = 1 ether;
        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        // Redeem some tokens before vesting ends
        vm.prank(user1);
        ico.redeem(positionId, 10000e18);

        // Move after vesting ends
        vm.warp(vestingEnd + 1 days);

        // After vesting ends, redeemable should be 0 regardless of remaining tokens
        uint256 redeemable = ico.redeemableTokens(positionId);
        assertEq(redeemable, 0);
    }

    function test_RedeemableTokens_EdgeCase_AllRedeemableTaken() public {
        uint256 ethAmount = 1 ether;
        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        // Move to middle of vesting
        vm.warp(vestingStart + 15 days);

        // Get redeemable amount
        uint256 redeemable = ico.redeemableTokens(positionId);
        assertGt(redeemable, 0);

        // Redeem all redeemable tokens
        vm.prank(user1);
        ico.redeem(positionId, redeemable);

        // After redeeming all redeemable, should be 0
        uint256 redeemableAfter = ico.redeemableTokens(positionId);
        assertEq(redeemableAfter, 0);
    }

    function test_RedeemableTokens_EdgeCase_MoreThanRedeemableClaimed() public {
        uint256 ethAmount = 1 ether;
        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        // Move to middle of vesting
        vm.warp(vestingStart + 15 days);

        // Get redeemable amount
        uint256 redeemable = ico.redeemableTokens(positionId);
        assertGt(redeemable, 0);

        // Claim more than redeemable (but less than total locked tokens)
        // This should work because claim doesn't check redeemable amount
        uint256 tokensToClaim = redeemable + 1000e18;
        (,,, uint256 tokenAmount,) = ico.positions(positionId);
        if (tokensToClaim <= tokenAmount) {
            vm.prank(user1);
            ico.claim(positionId, tokensToClaim);

            // After claiming more than redeemable, redeemable should be 0
            uint256 redeemableAfter = ico.redeemableTokens(positionId);
            assertEq(redeemableAfter, 0);
        }
    }

    function test_RedeemableTokens_Calculation_WithTakenTokens() public {
        uint256 ethAmount = 1 ether;
        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        // Move to middle of vesting
        vm.warp(vestingStart + 15 days);

        // Get initial values
        uint256 vestingRate = ico.vestingRate();
        (,,,, uint256 vestingAmount) = ico.positions(positionId);
        
        // Calculate expected redeemable: vestingRate * vestingAmount / BPS
        uint256 expectedRedeemable = vestingRate * vestingAmount / 10000;
        uint256 actualRedeemable = ico.redeemableTokens(positionId);
        
        // Should match (accounting for rounding)
        assertEq(actualRedeemable, expectedRedeemable);

        // Redeem some tokens
        uint256 tokensToRedeem = actualRedeemable / 2;
        vm.prank(user1);
        ico.redeem(positionId, tokensToRedeem);

        // Recalculate after redeem
        (,,, uint256 tokenAmountAfter,) = ico.positions(positionId);
        uint256 takenTokens = vestingAmount - tokenAmountAfter;
        uint256 expectedRedeemableAfter = expectedRedeemable > takenTokens ? (expectedRedeemable - takenTokens) : 0;
        uint256 actualRedeemableAfter = ico.redeemableTokens(positionId);

        assertEq(actualRedeemableAfter, expectedRedeemableAfter);
    }

    function test_RedeemableTokens_MultipleOperations() public {
        uint256 ethAmount = 1 ether;
        vm.prank(user1);
        uint256 positionId = ico.depositEther{value: ethAmount}();

        // Operation 1: Redeem
        vm.prank(user1);
        ico.redeem(positionId, 5000e18);
        uint256 redeemable1 = ico.redeemableTokens(positionId);
        assertEq(redeemable1, 15000e18);

        // Operation 2: Claim
        vm.prank(user1);
        ico.claim(positionId, 5000e18);
        uint256 redeemable2 = ico.redeemableTokens(positionId);
        assertEq(redeemable2, 10000e18);

        // Operation 3: Redeem again
        vm.prank(user1);
        ico.redeem(positionId, 5000e18);
        uint256 redeemable3 = ico.redeemableTokens(positionId);
        assertEq(redeemable3, 5000e18);

        // Operation 4: Claim remaining
        vm.prank(user1);
        ico.claim(positionId, 5000e18);
        uint256 redeemable4 = ico.redeemableTokens(positionId);
        assertEq(redeemable4, 0);
    }
}

