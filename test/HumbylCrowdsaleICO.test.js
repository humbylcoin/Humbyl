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
const HumbylCrowdsale = artifacts.require('HumbylCrowdsale');
const RefundVault = artifacts.require('RefundVault');

contract('HumbylCrowdsale', function ([owner, wallet, investor]) {
    const INIT_RATE = new BigNumber(2678);
    const FINAL_RATE = new BigNumber(1339);
    const GOAL = ether(3000);
    const CAP = ether(54000);
    const MIN_PUT = ether(3);

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async function () {
    console.log('latestTime: ' + latestTime())
    this.openingTime = new BigNumber(1526899975);
    this.closingTime = new BigNumber(1535785199);

    this.wallet = "0xaa2b65eea50eb267406a2fc4cae065c6dfdf4304";
    this.token = '0xf204a4ef082f5c04bb89f7d5e6568b796096735a';
    this.rate = this.initRate = new BigNumber(2678);
    this.finalRate = new BigNumber(1339);
    this.crowdsale = await HumbylCrowdsale.new({ from: owner });
  });

  it('should create crowdsale with correct parameters', async function () {
    this.crowdsale.should.exist;
    this.token.should.exist;

    const openingTime = await this.crowdsale.openingTime();
    const closingTime = await this.crowdsale.closingTime();
    const rate = await this.crowdsale.rate();
    const walletAddress = await this.crowdsale.wallet();
    const goal = await this.crowdsale.goal();
    const cap = await this.crowdsale.cap();
    const initRate = await this.crowdsale.initialRate();
    const finalRate = await this.crowdsale.finalRate();

    openingTime.should.be.bignumber.equal(this.openingTime);
    closingTime.should.be.bignumber.equal(this.closingTime);
    rate.should.be.bignumber.equal(INIT_RATE);
    walletAddress.should.be.equal(this.wallet);
    goal.should.be.bignumber.equal(GOAL);
    cap.should.be.bignumber.equal(CAP);
    initRate.should.be.bignumber.equal(this.initRate);
    finalRate.should.be.bignumber.equal(this.finalRate);
  });
});
