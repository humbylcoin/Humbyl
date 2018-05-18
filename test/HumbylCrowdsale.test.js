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
  const RATE = new BigNumber(10);
  const GOAL = ether(10);
  const CAP = ether(20);
  const MIN_PUT = new BigNumber('2345000000000000000');
  const NOW_MIN_PUT = ether(1);

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async function () {
    this.openingTime = latestTime() + duration.weeks(1);
    this.closingTime = this.openingTime + duration.weeks(1);
    this.afterClosingTime = this.closingTime + duration.seconds(1);

    this.token = await HumbylCoin.new({ from: owner });
    this.vault = await RefundVault.new(wallet, { from: owner });
    this.rate = RATE;
    this.finalRate = new BigNumber(6);
    this.crowdsale = await HumbylCrowdsale.new(
      this.openingTime, this.closingTime, wallet, this.token.address, GOAL, CAP, this.rate, this.finalRate
    );
    var minPut = await this.crowdsale.minPut();
    minPut.should.be.bignumber.equal(MIN_PUT);
    await this.crowdsale.setMinPut(NOW_MIN_PUT);
    minPut = await this.crowdsale.minPut();
    minPut.should.be.bignumber.equal(NOW_MIN_PUT);
    await this.token.approve(this.crowdsale.address, CAP * this.rate);
    this.allowWhitelist = async function () {
        await this.crowdsale.allow(investor, true, {from: owner});
        await this.crowdsale.allow(owner, true, {from: owner});
    }
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

    openingTime.should.be.bignumber.equal(this.openingTime);
    closingTime.should.be.bignumber.equal(this.closingTime);
    rate.should.be.bignumber.equal(RATE);
    walletAddress.should.be.equal(wallet);
    goal.should.be.bignumber.equal(GOAL);
    cap.should.be.bignumber.equal(CAP);
  });

  it('should not accept payments before start', async function () {
    await this.allowWhitelist();
    await this.crowdsale.send(NOW_MIN_PUT).should.be.rejectedWith(EVMRevert);
    await this.crowdsale.buyTokens(investor, { from: investor, value: NOW_MIN_PUT }).should.be.rejectedWith(EVMRevert);
  });

  it('should accept payments during the sale', async function () {
    await this.allowWhitelist();
    const investmentAmount = NOW_MIN_PUT;
    const expectedTokenAmount = RATE.mul(investmentAmount);

    await increaseTimeTo(this.openingTime)
    await this.crowdsale.buyTokens(investor, { value: investmentAmount, from: investor }).should.be.fulfilled;
    (await this.token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
  });
  it('should half price in the middle', async function () {
      await this.allowWhitelist();
      const investmentAmount = NOW_MIN_PUT;
      const rate = this.rate.add(this.finalRate).div(2);
      const expectedTokenAmount = rate.mul(investmentAmount);

      await increaseTimeTo((this.openingTime + this.closingTime) / 2);
      await this.crowdsale.buyTokens(investor, { value: investmentAmount, from: investor }).should.be.fulfilled;
      (await this.token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);

  });

  it('should reject payments after end', async function () {
    await this.allowWhitelist();
    await increaseTimeTo(this.afterEnd);
    await this.crowdsale.send(NOW_MIN_PUT).should.be.rejectedWith(EVMRevert);
    await this.crowdsale.buyTokens(investor, { value: NOW_MIN_PUT, from: investor }).should.be.rejectedWith(EVMRevert);
  });

  it('should reject payments over cap', async function () {
    await this.allowWhitelist();
    await increaseTimeTo(this.openingTime);
    await this.crowdsale.send(CAP);
    await this.crowdsale.send(1).should.be.rejectedWith(EVMRevert);
  });

  it('should allow finalization and transfer funds to wallet if the goal is reached', async function () {
    await this.allowWhitelist();
    await increaseTimeTo(this.openingTime);
    await this.crowdsale.send(GOAL);

    const beforeFinalization = web3.eth.getBalance(wallet);
    await increaseTimeTo(this.afterClosingTime);
    const beforeOwnerBalance = await this.token.balanceOf(owner);
    // const beforeCrowdsaleBalance = await this.token.balanceOf(this.crowdsale.address);
    // beforeCrowdsaleBalance.should.be.bignumber.greaterThan(0);

    await this.crowdsale.finalize({ from: owner });
    const afterFinalization = web3.eth.getBalance(wallet);
    const afterOwnerBalance = await this.token.balanceOf(owner);
    // const afterCrowdsaleBalance = await this.token.balanceOf(this.crowdsale.address);
    // afterCrowdsaleBalance.should.be.bignumber.equal(0);
    // beforeOwnerBalance.add(beforeCrowdsaleBalance).should.be.bignumber.equal(afterOwnerBalance)

    afterFinalization.minus(beforeFinalization).should.be.bignumber.equal(GOAL);
  });

  it('should allow refunds if the goal is not reached', async function () {
    await this.allowWhitelist();
    const balanceBeforeInvestment = web3.eth.getBalance(investor);

    await increaseTimeTo(this.openingTime);
    await this.crowdsale.sendTransaction({ value: NOW_MIN_PUT, from: investor, gasPrice: 0 });
    await increaseTimeTo(this.afterClosingTime);
    const beforeOwnerBalance = await this.token.balanceOf(owner);
    // const beforeCrowdsaleBalance = await this.token.balanceOf(this.crowdsale.address);
    // beforeCrowdsaleBalance.should.be.bignumber.greaterThan(0);

    await this.crowdsale.finalize({ from: owner });
    await this.crowdsale.claimRefund({ from: investor, gasPrice: 0 }).should.be.fulfilled;
    const afterOwnerBalance = await this.token.balanceOf(owner);
    // const afterCrowdsaleBalance = await this.token.balanceOf(this.crowdsale.address);
    // afterCrowdsaleBalance.should.be.bignumber.equal(0);
    // beforeOwnerBalance.add(beforeCrowdsaleBalance).should.be.bignumber.equal(afterOwnerBalance)

    const balanceAfterRefund = web3.eth.getBalance(investor);
    balanceBeforeInvestment.should.be.bignumber.equal(balanceAfterRefund);
  });
});
