// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Minimal Chainlink AggregatorV3-like mock used by tests.
contract MockChainlinkPriceFeed {
    uint8 internal _decimals;
    int256 internal _answer;

    uint80 internal _roundId;
    uint80 internal _answeredInRound;
    uint256 internal _startedAt;
    uint256 internal _updatedAt;

    constructor(uint8 decimals_, int256 initialAnswer) {
        _decimals = decimals_;
        _answer = initialAnswer;
        _roundId = 1;
        _answeredInRound = 1;
        _startedAt = block.timestamp;
        _updatedAt = block.timestamp;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function setAnswer(int256 newAnswer) external {
        _answer = newAnswer;
        _roundId++;
        _answeredInRound = _roundId;
        _updatedAt = block.timestamp;
    }

    /// @dev Compatibility shim for tests: Chainlink-style "price" == answer.
    function setPrice(int256 newPrice) external {
        this.setAnswer(newPrice);
    }

    /// @dev Overload used by tests: lets you set `updatedAt` to 0 to trigger RoundNotComplete.
    function setRoundData(uint80 roundId, int256 answer, uint256 updatedAt, uint80 answeredInRound) external {
        _roundId = roundId;
        _answer = answer;
        _startedAt = block.timestamp;
        _updatedAt = updatedAt;
        _answeredInRound = answeredInRound;
    }

    function setRoundData(
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

