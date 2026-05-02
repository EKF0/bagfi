// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SmartBagVault
 * @dev An ERC4626 compliant vault that takes a single asset (e.g., USDC) and
 * automatically deploys it into whitelisted yield strategies (e.g., Aave, Curve).
 */
contract SmartBagVault is ERC4626, Ownable {
    using SafeERC20 for IERC20;

    // The underlying asset (e.g., USDC)
    IERC20 private immutable _asset;

    // List of active strategies where funds can be deposited
    address[] public activeStrategies;

    event StrategyAdded(address indexed strategy);
    event StrategyRemoved(address indexed strategy);
    event FundsDeployed(address indexed strategy, uint256 amount);

    constructor(IERC20 asset_, string memory name_, string memory symbol_) 
        ERC4626(asset_) 
        ERC20(name_, symbol_) 
        Ownable(msg.sender)
    {
        _asset = asset_;
    }

    /**
     * @dev Add a new strategy.
     */
    function addStrategy(address strategy) external onlyOwner {
        activeStrategies.push(strategy);
        emit StrategyAdded(strategy);
    }

    /**
     * @dev Deploy underlying assets to a specific strategy.
     * Note: In a production environment, this should interface with specific protocols (Aave, etc.)
     */
    function deployToStrategy(uint256 strategyIndex, uint256 amount) external onlyOwner {
        require(strategyIndex < activeStrategies.length, "Invalid strategy index");
        address strategy = activeStrategies[strategyIndex];
        
        // Transfer funds to the strategy contract
        // In a real implementation this would use strategy-specific encoding (e.g. Aave supply())
        _asset.safeTransfer(strategy, amount);
        
        emit FundsDeployed(strategy, amount);
    }

    /**
     * @dev Called after deposit/mint.
     */
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal virtual override {
        super._deposit(caller, receiver, assets, shares);
        
        // Auto-deploy logic can be triggered here if desired,
        // or left to a keeper/crank function to save gas on user deposits.
    }
}
