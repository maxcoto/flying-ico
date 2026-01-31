// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/src/Test.sol";

import {DeployFactoryFlyingICO} from "../script/DeployFactory.s.sol";
import {FactoryFlyingICO} from "../src/Factory.sol";

/// @dev Coverage-focused test: executes the deploy script's `run()` so script sources
/// are not stuck at 0% in `forge coverage`.
contract DeployFactoryScriptCoverageTest is Test {
    function test_script_run_executes() public {
        DeployFactoryFlyingICO s = new DeployFactoryFlyingICO();

        // `run()` uses broadcast cheatcodes; Foundry supports them in tests as well.
        FactoryFlyingICO factory = s.run();

        assertTrue(address(factory).code.length > 0);
    }
}

