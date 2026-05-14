/* eslint-disable */
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BagFiZapper", function () {
  let zapper;
  let owner;
  let user;
  let usdc; // Mock USDC token
  let weth; // Mock WETH token
  let router; // Mock 1inch/LiFi router

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    weth = await MockERC20.deploy("Wrapped ETH", "WETH", 18);
    
    // Mint some tokens for testing
    await usdc.mint(await owner.getAddress(), ethers.parseUnits("10000", 6));
    await weth.mint(await owner.getAddress(), ethers.parseUnits("1000", 18));

    // Deploy a mock router contract (simulating 1inch/LiFi)
    const MockRouter = await ethers.getContractFactory("MockRouter");
    router = await MockRouter.deploy();
    await router.waitForDeployment();

    // Deploy the BagFiZapper
    const BagFiZapper = await ethers.getContractFactory("BagFiZapper");
    zapper = await BagFiZapper.deploy(await usdc.getAddress(), await weth.getAddress(), await router.getAddress());
    await zapper.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct token addresses", async function () {
      expect(await zapper.usdc()).to.equal(await usdc.getAddress());
      expect(await zapper.weth()).to.equal(await weth.getAddress());
      expect(await zapper.router()).to.equal(await router.getAddress());
    });

    it("Should set the owner correctly", async function () {
      expect(await zapper.owner()).to.equal(owner.address);
    });
  });

  describe("Zap In", function () {
    it("Should allow owner to zap in ETH to USDC via router", async function () {
      // Approve zapper to spend WETH
      await weth.approve(await zapper.getAddress(), ethers.parseUnits("1", 18));

      // Mock the router's swapAndSend function
      // In a real test, we would mock the actual 1inch/LiFi interface
      // For this test, we'll just verify the transaction calls succeed

      await expect(zapper.connect(owner).zapIn(ethers.parseUnits("0.1", 18), user.address))
        .to.not.be.reverted;
    });

    it("Should revert if non-owner tries to zap in", async function () {
      await expect(zapper.connect(user).zapIn(ethers.parseUnits("0.1", 18), user.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Zap Out", function () {
    it("Should allow owner to zap out USDC to WETH via router", async function () {
      // First deposit some USDC into the zapper
      await usdc.approve(await zapper.getAddress(), ethers.parseUnits("100", 6));
      // In a real implementation, there would be a deposit function
      // For this test, we'll skip to the zap out functionality

      // Mock the router's swapAndSend function for zap out
      await expect(zapper.connect(owner).zapOut(ethers.parseUnits("50", 6), user.address))
        .to.not.be.reverted;
    });

    it("Should revert if non-owner tries to zap out", async function () {
      await expect(zapper.connect(user).zapOut(ethers.parseUnits("50", 6), user.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});

/* eslint-disable */
// Mock ERC20 contract for testing
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) {
        name = name_;
        symbol = symbol_;
        decimals = decimals_;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "ERC20: transfer amount exceeds balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "ERC20: transfer amount exceeds balance");
        require(allowance[from][msg.sender] >= amount, "ERC20: transfer amount exceeds allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }
}

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

    function receive() external payable {
        // Allow receiving ETH
    }
}