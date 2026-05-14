// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Mock Router contract for testing (simulating 1inch/LiFi)
contract MockRouter {
    // Simulate the swapAndSend function that 1inch/LiFi would expose
    function swapAndSend(
        address fromToken,
        address toToken,
        uint256 fromAmount,
        address toAddress
    ) external payable {
        // In a real implementation, this would interact with 1inch/LiFi APIs
        // For testing, we just make sure it doesn't revert
    }

    receive() external payable {
        // Allow receiving ETH
    }
}
