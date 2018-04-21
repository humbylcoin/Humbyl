const HumbylCrowdsale = artifacts.require("./HumbylCrowdsale.sol")
const HumbylCoin = artifacts.require("./HumbylCoin.sol")

module.exports = function(deployer, network, accounts) {
    const startTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1 // one second in the future
    const endTime = startTime + (86400 * 20) // 20 days
    const rate = new web3.BigNumber(1000)
    const wallet = accounts[0]
    const cap = 10000
    const goal = 5000
    const initialRate = 200
    const finalRate = 100
    deployer.deploy(HumbylCoin).then(function () {
        deployer.deploy(HumbylCrowdsale, startTime, endTime, rate, wallet, HumbylCoin.address, goal, cap, initialRate, finalRate)
    })
};