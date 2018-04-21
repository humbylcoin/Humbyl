import ether from '../node_modules/zeppelin-solidity/test/helpers/ether';
import { advanceBlock } from '../node_modules/zeppelin-solidity/test/helpers/advanceToBlock';
import { increaseTimeTo, duration } from '../node_modules/zeppelin-solidity/test/helpers/increaseTime';
import latestTime from '../node_modules/zeppelin-solidity/test/helpers/latestTime';
import EVMRevert from '../node_modules/zeppelin-solidity/test/helpers/EVMRevert';

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const HumbylCoin = artifacts.require('HumbylCoin');
const HumbylPresale = artifacts.require('HumbylPresale');

contract('HumbylPresale', function ([owner, wallet, investor]) {
  const RATE = new BigNumber(4320);
  const CAP = ether(20);

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

    it('estimateGas', async function () {
        const token = await HumbylCoin.new({ from: owner });
        const estimateGas = await HumbylPresale.new(RATE, wallet, token.address, CAP).estimateGas();
        console.log('estimateGas: ' + estimateGas);
    });

});
