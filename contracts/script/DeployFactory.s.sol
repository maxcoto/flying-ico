// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/src/Script.sol";
import {FactoryFlyingICO} from "../src/Factory.sol";

contract DeployFactoryFlyingICO is Script {
    function run() public returns (FactoryFlyingICO factory) {
        vm.startBroadcast();

        factory = new FactoryFlyingICO();

        vm.stopBroadcast();

        console.log("Factory deployed at:", address(factory));
    }
}

// Simulation:
// forge script script/DeployFactory.s.sol:DeployFactoryFlyingICO
//
// Deployment:
// forge script script/DeployFactory.s.sol:DeployFactoryFlyingICO --rpc-url <RPC_URL> --private-key <PRIVATE_KEY> --broadcast
