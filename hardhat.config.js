require("dotenv").config();

require('dotenv').config();
require("@nomicfoundation/hardhat-toolbox");
require('hardhat-contract-sizer');
require("hardhat-gas-reporter");
require('@openzeppelin/hardhat-upgrades');
// require("solidity-coverage");
require('hardhat-abi-exporter');
require('solidity-docgen');
// require("@truffle/dashboard-hardhat-plugin");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      forking: {
        url: process.env.ALCHEMY_URL,
        blockNumber: 15000000 // Change accordingly
      },
    },
    dashboard: {
      url: "http://localhost:24012/rpc",
    },
  },
  gasReporter: {
    enabled: true,
    coinmarketcap: `${process.env.CMC_API_KEY}`,
    currency: 'EUR',
    // gasPriceApi: "https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice",
    // token: "MATIC"
    gasPriceApi: "https://api.etherscan.io/api?module=proxy&action=eth_gasPrice",
    token: "ETH"
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};