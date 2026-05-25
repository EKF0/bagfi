// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title SmartBagVault
 * @dev An ERC4626 compliant vault that takes a single asset (e.g., USDC) and
 * automatically deploys it into whitelisted yield strategies (e.g., Aave, Curve).
 */
contract SmartBagVault is ERC4626, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // The underlying asset (e.g., USDC)
    IERC20 private immutable _asset;

    // List of active strategies where funds can be deposited
    address[] public activeStrategies;
    // Set for fast lookup of whether a strategy is active
    mapping(address => bool) public isActiveStrategy;

    event StrategyAdded(address indexed strategy);
    event StrategyRemoved(address indexed strategy);
    event FundsDeployed(address indexed strategy, uint256 amount);
    event Paused();
    event Unpaused();

    constructor(IERC20 asset_, string memory name_, string memory symbol_) 
        ERC4626(asset_) 
        ERC20(name_, symbol_) 
        Ownable(msg.sender)
    {
        _asset = asset_;
    }

    /**
     * @dev Add a new strategy.
     * @param strategy The address of the strategy to add
     */
    function addStrategy(address strategy) external onlyOwner whenNotPaused {
        require(strategy != address(0), "Strategy cannot be zero address");
        require(!isActiveStrategy[strategy], "Strategy already active");
        
        activeStrategies.push(strategy);
        isActiveStrategy[strategy] = true;
        emit StrategyAdded(strategy);
    }

    /**
     * @dev Remove a strategy.
     * @param strategy The address of the strategy to remove
     */
    function removeStrategy(address strategy) external onlyOwner whenNotPaused {
        require(isActiveStrategy[strategy], "Strategy is not active");
        
        // Find and remove from array
        uint256 indexToRemove = 0;
        bool found = false;
        for (uint256 i = 0; i < activeStrategies.length; i++) {
            if (activeStrategies[i] == strategy) {
                indexToRemove = i;
                found = true;
                break;
            }
        }
        
        require(found, "Strategy not found in active strategies");
        
        // Remove by moving last element to this position and popping
        if (indexToRemove < activeStrategies.length - 1) {
            activeStrategies[indexToRemove] = activeStrategies[activeStrategies.length - 1];
        }
        activeStrategies.pop();
        
        isActiveStrategy[strategy] = false;
        emit StrategyRemoved(strategy);
    }

    /**
     * @dev Deploy underlying assets to a specific strategy.
     * Note: In a production environment, this should interface with specific protocols (Aave, etc.)
     */
    function deployToStrategy(uint256 strategyIndex, uint256 amount) external onlyOwner whenNotPaused {
        require(strategyIndex < activeStrategies.length, "Invalid strategy index");
        address strategy = activeStrategies[strategyIndex];
         
        // Transfer funds to the strategy contract
        // In a real implementation this would use strategy-specific encoding (e.g. Aave supply())
        _asset.safeTransfer(strategy, amount);
         
        emit FundsDeployed(strategy, amount);
    }

    /**
     * @dev Pause all critical functions
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause all critical functions
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Called after deposit/mint.
     */
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal virtual override whenNotPaused {
        super._deposit(caller, receiver, assets, shares);
         
        // Auto-deploy logic can be triggered here if desired,
        // or left to a keeper/crank function to save gas on user deposits.
    }

    /**
     * @dev Called after withdraw/burn.
     */
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal virtual override whenNotPaused {
        super._withdraw(caller, receiver, owner, assets, shares);
    }
}
