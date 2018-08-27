const HumbylBridge = artifacts.require("./HumbylBridge.sol")
const HumbylCoin = artifacts.require("./HumbylCoin.sol")

module.exports = function(deployer, network, accounts) {
    const startTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1 // one second in the future
    const endTime = startTime + (86400 * 20) // 20 days
    const wallet = accounts[0]
    const cap = 10000
    const goal = 5000
    const initialRate = 200
    const finalRate = 100

    deployer.deploy(HumbylCoin).then(function () {
        deployer.deploy(HumbylBridge, wallet, HumbylCoin.address, 1339).catch(function (error) {
            console.log('error: ' + error)
        })
    })
};