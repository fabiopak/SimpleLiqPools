const { expect } = require("chai");
const { BigNumber, constants, utils } = require('ethers');

require("@nomicfoundation/hardhat-chai-matchers");

// Token addresses
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

// Addresses of users who hold WETH and USDC
const wethHolder = "0x2093b4281990A568C9D588b8BCE3BFD7a1557Ebd";
const daiHolder = "0x616eFd3E811163F8fc180611508D72D842EA7D07";


const fromWei = (x) => ethers.formatEther(x);
const toWei = (x) => ethers.parseEther(x.toString());
const fromWei6Dec = (x) => Number(x) / Math.pow(10, 6);
const toWei6Dec = (x) => Number(x) * Math.pow(10, 6);
const fromWei8Dec = (x) => Number(x) / Math.pow(10, 8);
const toWei8Dec = (x) => Number(x) * Math.pow(10, 8);
const hundredWeth = toWei(100);
const tenThousandDai = toWei(10000);
const thousandDai = toWei(1000);



const sendWeth = async (address, amount) => {
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [wethHolder],
    });

    const wethImpersonatedSigner = await ethers.getSigner(wethHolder);

    let weth = await ethers.getContractAt("IERC20", WETH_ADDRESS, wethImpersonatedSigner);

    const transferWeth = await weth.connect(wethImpersonatedSigner).transfer(address, amount);

    await transferWeth.wait();
};

const sendDai = async (address, amount) => {
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [daiHolder],
    });

    const daiImpersonatedSigner = await ethers.getSigner(daiHolder);

    let dai = await ethers.getContractAt("IERC20", DAI_ADDRESS, daiImpersonatedSigner);

    const transferDai = await dai.connect(daiImpersonatedSigner).transfer(address, amount);

    await transferDai.wait();
};

// const getWethBalance = async (address) => {
//     let weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);

//     let balance = await weth.balanceOf(address);
//     balance = balance / 10 ** 18;

//     console.log(`User WETH balance: ${balance}`);
// };

// const getDaiBalance = async (address) => {
//     let dai = await ethers.getContractAt("IERC20", DAI_ADDRESS);

//     let balance = await dai.balanceOf(address);
//     balance = balance / 10 ** 6;

//     console.log(`User DAI balance: ${balance}`);
// };



describe("Liquidity Pool", function () {
    let Dex;
    let dex;
    let deployer;
    let bob;
    let alice;


    beforeEach(async function () {
        [deployer, bob, alice] = await ethers.getSigners();
        Dex = await ethers.getContractFactory("Dex");
        dex = await Dex.deploy();
        await dex.waitForDeployment();
    });

    it("Check if event is emitted successfully for user creating a liquidity pool", async function () {
        let tx = await dex.connect(bob).createLiquidityPool(DAI_ADDRESS, WETH_ADDRESS);

        //get event
        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        transferEventInterface = new ethers.Interface(["event LiquidityPoolCreated(address indexed _addressToken1, address indexed _addressToken2,address indexed _addressLiquidityPool)"]);
        // console.log(receipt.logs)
        const data = receipt.logs[0].data;
        const topics = receipt.logs[0].topics;
        eventlog = transferEventInterface.decodeEventLog("LiquidityPoolCreated", data, topics);
        let eventLpAddress = eventlog[2];

        let arrayLpAddress = await dex.liquidityPools(0);

        expect(eventLpAddress).to.equal(arrayLpAddress);
    });

    it("Get initial reserves of newly created liquidity pool", async function () {
        let tx = await dex.connect(bob).createLiquidityPool(DAI_ADDRESS, WETH_ADDRESS);

        //get event
        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        transferEventInterface = new ethers.Interface(["event LiquidityPoolCreated(address indexed _addressToken1, address indexed _addressToken2,address indexed _addressLiquidityPool)"]);
        // console.log(receipt.logs)
        const data = receipt.logs[0].data;
        const topics = receipt.logs[0].topics;
        eventlog = transferEventInterface.decodeEventLog("LiquidityPoolCreated", data, topics);
        let lpAddress = eventlog[2];

        let pool = await ethers.getContractAt("LiquidityPool", lpAddress, bob);

        let [reserve1, reserve2] = await pool.getReserves();

        expect(reserve1).to.equal(0);
        expect(reserve2).to.equal(0);
    });

    it("User adds liquidity to pool", async function () {
        // Create pool
        let tx = await dex.connect(bob).createLiquidityPool(DAI_ADDRESS, WETH_ADDRESS);

        //get event
        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        transferEventInterface = new ethers.Interface(["event LiquidityPoolCreated(address indexed _addressToken1, address indexed _addressToken2,address indexed _addressLiquidityPool)"]);
        // console.log(receipt.logs)
        const data = receipt.logs[0].data;
        const topics = receipt.logs[0].topics;
        eventlog = transferEventInterface.decodeEventLog("LiquidityPoolCreated", data, topics);
        console.log(eventlog)

        // Events for addresses
        let lpAddress = eventlog[2];
        let token1Address = eventlog[0]; // token1 address is DAI
        let token2Address = eventlog[1];; // token2 address is WETH

        let pool = await ethers.getContractAt("LiquidityPool", lpAddress, bob);

        // Send Bob some USDC and WETH
        await sendWeth(bob.address, hundredWeth);
        await sendDai(bob.address, tenThousandDai);

        let dai = await ethers.getContractAt("IERC20", DAI_ADDRESS, deployer);
        let weth = await ethers.getContractAt("IERC20", WETH_ADDRESS, deployer);

        // ERC20 token approvals
        await dai.connect(bob).approve(lpAddress, tenThousandDai);
        await weth.connect(bob).approve(lpAddress, hundredWeth);

        // Add liquidity
        await pool.connect(bob).addLiquidity(tenThousandDai, hundredWeth);

        // Get reserve amounts
        let [reserve1, reserve2] = await pool.getReserves();

        expect(reserve1).to.equal(tenThousandDai);
        expect(reserve2).to.equal(hundredWeth);

        let bobLpShares = await pool.userLiquidity(bob.address);
        let result = tenThousandDai * hundredWeth;
        let calculatedResult = bobLpShares * bobLpShares;

        expect(result).to.equal(calculatedResult);
    });

    it("User removes liquidity from pool", async function () {
        // Create pool
        let tx = await dex.connect(bob).createLiquidityPool(DAI_ADDRESS, WETH_ADDRESS);

        //get event
        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        transferEventInterface = new ethers.Interface(["event LiquidityPoolCreated(address indexed _addressToken1, address indexed _addressToken2,address indexed _addressLiquidityPool)"]);
        // console.log(receipt.logs)
        const data = receipt.logs[0].data;
        const topics = receipt.logs[0].topics;
        eventlog = transferEventInterface.decodeEventLog("LiquidityPoolCreated", data, topics);
        console.log(eventlog)

        // Events for addresses
        let lpAddress = eventlog[2];
        let token1Address = eventlog[0]; // token1 address is DAI
        let token2Address = eventlog[1]; // token2 address is WETH

        let pool = await ethers.getContractAt("LiquidityPool", lpAddress, bob);

        // Send Bob some DAI and WETH
        await sendWeth(bob.address, hundredWeth);
        await sendDai(bob.address, tenThousandDai);

        let dai = await ethers.getContractAt("IERC20", DAI_ADDRESS, deployer);
        let weth = await ethers.getContractAt("IERC20", WETH_ADDRESS, deployer);

        // ERC20 token approvals
        await dai.connect(bob).approve(lpAddress, tenThousandDai);
        await weth.connect(bob).approve(lpAddress, hundredWeth);

        // Add liquidity
        await pool.connect(bob).addLiquidity(tenThousandDai, hundredWeth);

        // Get Bob's LP token shares
        let bobLpShares = await pool.userLiquidity(bob.address);

        // Remove liquidity
        await pool.connect(bob).removeLiquidity(bobLpShares);

        // Get reserve amounts
        let [reserve1, reserve2] = await pool.getReserves();

        expect(reserve1).to.equal(0);
        expect(reserve2).to.equal(0);

        // Get Bob's final LP token shares
        let bobFinalLpShares = await pool.userLiquidity(bob.address);

        expect(bobFinalLpShares).to.equal(0);
    });

    it("User swaps tokens from pool", async function () {
        // Create pool
        let tx = await dex.connect(bob).createLiquidityPool(DAI_ADDRESS, WETH_ADDRESS);

        //get event
        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        transferEventInterface = new ethers.Interface(["event LiquidityPoolCreated(address indexed _addressToken1, address indexed _addressToken2,address indexed _addressLiquidityPool)"]);
        // console.log(receipt.logs)
        const data = receipt.logs[0].data;
        const topics = receipt.logs[0].topics;
        eventlog = transferEventInterface.decodeEventLog("LiquidityPoolCreated", data, topics);
        console.log(eventlog)

        // Events for addresses
        let lpAddress = eventlog[2];
        let token1Address = eventlog[0]; // token1 address is DAI
        let token2Address = eventlog[1]; // token2 address is WETH

        let pool = await ethers.getContractAt("LiquidityPool", lpAddress, bob);

        // Send Bob some DAI and WETH
        await sendWeth(bob.address, hundredWeth);
        await sendDai(bob.address, tenThousandDai);

        // Send Alice some DAI to swap to WETH
        await sendDai(alice.address, thousandDai);

        let dai = await ethers.getContractAt("IERC20", DAI_ADDRESS, deployer);
        let weth = await ethers.getContractAt("IERC20", WETH_ADDRESS, deployer);

        let aliceDaiBalanceInitial = await dai.balanceOf(alice.address);
        let aliceWethBalanceInitial = await weth.balanceOf(alice.address);
        expect(aliceDaiBalanceInitial).to.equal(thousandDai);
        expect(aliceWethBalanceInitial).to.equal(0);

        // ERC20 token approvals
        await dai.connect(bob).approve(lpAddress, tenThousandDai);
        await weth.connect(bob).approve(lpAddress, hundredWeth);

        // Add liquidity
        await pool.connect(bob).addLiquidity(tenThousandDai, hundredWeth);

        // Alice swaps DAI for WETH
        await dai.connect(alice).approve(lpAddress, thousandDai);
        await pool.connect(alice).swapTokens(DAI_ADDRESS, thousandDai);

        let aliceDaiBalanceFinal = await dai.balanceOf(alice.address);
        let aliceWethBalanceFinal = await weth.balanceOf(alice.address);
        expect(aliceDaiBalanceFinal).to.equal(0);
        expect(aliceWethBalanceFinal).to.be.above(aliceWethBalanceInitial);
    });

});

