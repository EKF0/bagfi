const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SmartBagVault", function () {
  let vault;
  let owner;
  let user;
  let asset; // Mock ERC20 token
  let strategy;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token to use as the vault's asset
    const MockERC20 = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    asset = await MockERC20.deploy("Mock USDC", "mUSDC", 6);
    await asset.waitForDeployment();
    
    // Mint tokens to user for testing
    await asset.mint(user.address, ethers.parseUnits("10000", 6));

    // Deploy the SmartBagVault
    const SmartBagVault = await ethers.getContractFactory("SmartBagVault");
    vault = await SmartBagVault.deploy(await asset.getAddress(), "Smart Bag Vault", "sbVAULT");
    await vault.waitForDeployment();

    // Deploy a mock strategy contract
    const MockStrategy = await ethers.getContractFactory("contracts/mocks/MockStrategy.sol:MockStrategy");
    strategy = await MockStrategy.deploy();
    await strategy.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct asset", async function () {
      expect(await vault.asset()).to.equal(await asset.getAddress());
    });

    it("Should have correct name and symbol", async function () {
      expect(await vault.name()).to.equal("Smart Bag Vault");
      expect(await vault.symbol()).to.equal("sbVAULT");
    });

    it("Should set the owner correctly", async function () {
      expect(await vault.owner()).to.equal(owner.address);
    });
  });

  describe("Deposit", function () {
    it("Should allow users to deposit assets", async function () {
      // Approve vault to spend tokens
      const depositAmount = ethers.parseUnits("1000", 6); // 1000 mUSDC
      await asset.approve(await vault.getAddress(), depositAmount);

      // Deposit tokens
      await expect(vault.connect(user).deposit(depositAmount, user.address))
        .to.emit(vault, "Deposit")
        .withArgs(user.address, user.address, depositAmount, depositAmount); // Assuming 1:1 share ratio for simplicity

      // Check user's share balance
      expect(await vault.sharesOf(user.address)).to.equal(depositAmount);
    });

    it("Should revert if deposit amount is zero", async function () {
        await expect(vault.connect(user).deposit(0, user.address)).to.be.reverted;
    });
  });

  describe("Withdraw", function () {
    it("Should allow users to withdraw their assets", async function () {
      const depositAmount = ethers.parseUnits("1000", 6); // 1000 mUSDC
      await asset.approve(await vault.getAddress(), depositAmount);

      // Deposit tokens
      await vault.connect(user).deposit(depositAmount, user.address);

      // Withdraw tokens
      await expect(vault.connect(user).withdraw(depositAmount, user.address, user.address))
        .to.emit(vault, "Withdraw")
        .withArgs(user.address, user.address, user.address, depositAmount, depositAmount);

      // Check user's share balance is zero
      expect(await vault.sharesOf(user.address)).to.equal(0);
    });
  });

  describe("Strategy Management", function () {
    it("Should allow owner to add a strategy", async function () {
      await expect(vault.addStrategy(await strategy.getAddress()))
        .to.emit(vault, "StrategyAdded")
        .withArgs(await strategy.getAddress());

      expect(await vault.activeStrategies(0)).to.equal(await strategy.getAddress());
    });

    it("Should revert if non-owner tries to add strategy", async function () {
      await expect(vault.connect(user).addStrategy(await strategy.getAddress()))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to deploy funds to a strategy", async function () {
      // First add a strategy
      await vault.addStrategy(await strategy.getAddress());

      // Deposit some funds to the vault
      const depositAmount = ethers.parseUnits("500", 6);
      await asset.approve(await vault.getAddress(), depositAmount);
      await vault.deposit(depositAmount, await vault.getAddress()); // Deposit to vault itself

      // Deploy funds to strategy
      await expect(vault.deployToStrategy(0, depositAmount))
        .to.emit(vault, "FundsDeployed")
        .withArgs(await strategy.getAddress(), depositAmount);
    });

    it("Should revert if non-owner tries to deploy funds", async function () {
      // First add a strategy
      await vault.addStrategy(await strategy.getAddress());

      await expect(vault.connect(user).deployToStrategy(0, ethers.parseUnits("100", 6)))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should revert if invalid strategy index is used", async function () {
      await expect(vault.deployToStrategy(0, ethers.parseUnits("100", 6)))
        .to.be.revertedWith("Invalid strategy index");
    });
  });
});