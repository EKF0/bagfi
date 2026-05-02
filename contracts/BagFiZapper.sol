// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";

/**
 * @title BagFiZapper
 * @dev Facilitates 1-click zap-ins: taking any token, converting it to the Vault's asset (via 1inch/LiFi),
 * and depositing into the ERC4626 vault.
 */
contract BagFiZapper {
    using SafeERC20 for IERC20;

    /**
     * @dev Zap a supported token into the vault. This assumes the offchain API (like 1inch)
     * provided the swap data to convert `tokenIn` to the Vault's `asset()`.
     * 
     * @param vault The ERC4626 vault.
     * @param tokenIn The token the user is depositing.
     * @param amountIn The amount of `tokenIn` to deposit.
     * @param router The swap router (e.g., 1inch).
     * @param swapData The encoded swap transaction.
     */
    function zapIn(
        IERC4626 vault,
        IERC20 tokenIn,
        uint256 amountIn,
        address router,
        bytes calldata swapData
    ) external payable returns (uint256 sharesOut) {
        // 1. Transfer user's tokenIn to this contract
        tokenIn.safeTransferFrom(msg.sender, address(this), amountIn);

        // 2. Approve the swap router
        tokenIn.approve(router, amountIn);

        // 3. Execute swap (tokenIn -> Vault's Asset)
        (bool success, ) = router.call{value: msg.value}(swapData);
        require(success, "Swap failed");

        // 4. Get the balance of the asset received from the swap
        IERC20 asset = IERC20(vault.asset());
        uint256 swappedAmount = asset.balanceOf(address(this));
        require(swappedAmount > 0, "No assets received");

        // 5. Approve the vault and deposit
        asset.approve(address(vault), swappedAmount);
        sharesOut = vault.deposit(swappedAmount, msg.sender);
    }
}
