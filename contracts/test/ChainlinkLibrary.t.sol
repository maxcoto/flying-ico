// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/src/Test.sol";

import {ChainlinkLibrary, IPriceFeed} from "../src/utils/Chainlink.sol";

contract MockPriceFeed is IPriceFeed {
    uint80 internal _roundId;
    int256 internal _answer;
    uint256 internal _startedAt;
    uint256 internal _updatedAt;
    uint80 internal _answeredInRound;

    function set(
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) external {
        _roundId = roundId;
        _answer = answer;
        _startedAt = startedAt;
        _updatedAt = updatedAt;
        _answeredInRound = answeredInRound;
    }

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (_roundId, _answer, _startedAt, _updatedAt, _answeredInRound);
    }
}

contract ChainlinkLibraryHarness {
    function getPrice(address oracle, uint256 frequency, address sequencer) external view returns (uint256) {
        return ChainlinkLibrary.getPrice(oracle, frequency, sequencer);
    }
}

contract ChainlinkLibraryTest is Test {
    ChainlinkLibraryHarness internal h;
    MockPriceFeed internal oracle;
    MockPriceFeed internal sequencer;

    function setUp() public {
        h = new ChainlinkLibraryHarness();
        oracle = new MockPriceFeed();
        sequencer = new MockPriceFeed();
    }

    function test_getPrice_reverts_on_zero_oracle() public {
        vm.expectRevert(ChainlinkLibrary.ChainlinkLibrary__InvalidOracle.selector);
        h.getPrice(address(0), 0, address(0));
    }

    function test_getPrice_reverts_on_invalid_price() public {
        oracle.set(1, 0, 1, 1, 1);
        vm.expectRevert(ChainlinkLibrary.ChainlinkLibrary__InvalidPrice.selector);
        h.getPrice(address(oracle), 0, address(0));
    }

    function test_getPrice_reverts_on_old_data_answeredInRound_lt_roundId() public {
        oracle.set(2, 1, 1, 1, 1);
        vm.expectRevert(ChainlinkLibrary.ChainlinkLibrary__OldData.selector);
        h.getPrice(address(oracle), 0, address(0));
    }

    function test_getPrice_reverts_on_old_data_roundId_zero() public {
        oracle.set(0, 1, 1, 1, 0);
        vm.expectRevert(ChainlinkLibrary.ChainlinkLibrary__OldData.selector);
        h.getPrice(address(oracle), 0, address(0));
    }

    function test_getPrice_reverts_on_round_not_complete_updatedAt_zero() public {
        oracle.set(1, 1, 1, 0, 1);
        vm.expectRevert(ChainlinkLibrary.ChainlinkLibrary__RoundNotComplete.selector);
        h.getPrice(address(oracle), 0, address(0));
    }

    function test_getPrice_reverts_on_stale_price_when_frequency_set() public {
        uint256 nowTs = 1_000_000;
        vm.warp(nowTs);
        oracle.set(1, 1, 1, nowTs - 1000, 1);

        vm.expectRevert(ChainlinkLibrary.ChainlinkLibrary__StalePrice.selector);
        h.getPrice(address(oracle), 10, address(0));
    }

    function test_getPrice_sequencer_down_reverts() public {
        uint256 nowTs = 1_000_000;
        vm.warp(nowTs);
        oracle.set(1, 123, 1, nowTs, 1);
        // Sequencer: answer > 0 indicates DOWN
        sequencer.set(1, 1, nowTs - 10_000, nowTs, 1);

        vm.expectRevert(ChainlinkLibrary.ChainlinkLibrary__SequencerDown.selector);
        h.getPrice(address(oracle), 0, address(sequencer));
    }

    function test_getPrice_sequencer_round_not_complete_reverts_when_startedAt_zero() public {
        uint256 nowTs = 1_000_000;
        vm.warp(nowTs);
        oracle.set(1, 123, 1, nowTs, 1);
        // Sequencer: up, but startedAt == 0
        sequencer.set(1, 0, 0, nowTs, 1);

        vm.expectRevert(ChainlinkLibrary.ChainlinkLibrary__RoundNotComplete.selector);
        h.getPrice(address(oracle), 0, address(sequencer));
    }

    function test_getPrice_grace_period_not_over_reverts() public {
        uint256 nowTs = 1_000_000;
        vm.warp(nowTs);
        oracle.set(1, 123, 1, nowTs, 1);
        // Sequencer: up, but startedAt is within last hour.
        sequencer.set(1, 0, nowTs - 30 minutes, nowTs, 1);

        vm.expectRevert(ChainlinkLibrary.ChainlinkLibrary__GracePeriodNotOver.selector);
        h.getPrice(address(oracle), 0, address(sequencer));
    }

    function test_getPrice_success_no_frequency_no_sequencer() public {
        oracle.set(1, 123, 1, 1, 1);
        uint256 price = h.getPrice(address(oracle), 0, address(0));
        assertEq(price, 123);
    }

    function test_getPrice_success_with_frequency_and_sequencer() public {
        uint256 nowTs = 1_000_000;
        vm.warp(nowTs);
        oracle.set(1, 123, 1, nowTs, 1);
        // Sequencer: up, and grace period over.
        sequencer.set(1, 0, nowTs - 2 hours, nowTs, 1);

        uint256 price = h.getPrice(address(oracle), 100, address(sequencer));
        assertEq(price, 123);
    }
}

