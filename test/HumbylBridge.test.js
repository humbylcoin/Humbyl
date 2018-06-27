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
const HumbylBridge = artifacts.require('HumbylBridge');

contract('HumbylBridge', function ([owner, wallet, investor]) {

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async function () {
    this.token = await HumbylCoin.new({ from: owner });
    this.bridge = await HumbylBridge.new(wallet, this.token.address, { from: owner });
  });

  it('should create bridge with correct parameters', async function () {
    this.bridge.should.exist;
    this.token.should.exist;

    const walletAddress = await this.bridge.wallet();
    const tokenAddress = await this.bridge.token();

    walletAddress.should.be.equal(wallet);
    tokenAddress.should.be.equal(this.token.address);
  });

  it('test approve', async function () {
    var approved = await this.bridge.operators(investor);
    assert(!approved);
    await this.bridge.approve(investor, true, { from: investor}).should.be.rejectedWith(EVMRevert);
    await this.bridge.approve(investor, true, { from: owner});
    approved = await this.bridge.operators(investor);
    assert(approved);
  });

  it('test setWallet', async function () {
        var walletAddress = await this.bridge.wallet();
        assert(walletAddress === wallet);
        await this.bridge.setWallet(investor, { from: investor}).should.be.rejectedWith(EVMRevert);
        await this.bridge.setWallet(investor, { from: owner});
        walletAddress = await this.bridge.wallet();
        assert(walletAddress === investor);
  });
  it('test withdraw for owner', async function () {
      const initAllowance = 1000;
      const identity = 1;
      const weiAmount = 1;
      await this.token.approve(this.bridge.address, initAllowance, { from: owner});
      await this.bridge.withdraw(investor, identity, weiAmount, { from: investor}).should.be.rejectedWith(EVMRevert);

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

    await this.crowdsale.finalize({ from: owner });
    const afterFinalization = web3.eth.getBalance(wallet);
    const afterOwnerBalance = await this.token.balanceOf(owner);

    afterFinalization.minus(beforeFinalization).should.be.bignumber.equal(GOAL);
  });

  it('should allow refunds if the goal is not reached', async function () {
    await this.allowWhitelist();
    const balanceBeforeInvestment = web3.eth.getBalance(investor);

    await increaseTimeTo(this.openingTime);
    await this.crowdsale.sendTransaction({ value: NOW_MIN_PUT, from: investor, gasPrice: 0 });
    await increaseTimeTo(this.afterClosingTime);
    const beforeOwnerBalance = await this.token.balanceOf(owner);

    await this.crowdsale.finalize({ from: owner });
    await this.crowdsale.claimRefund({ from: investor, gasPrice: 0 }).should.be.fulfilled;
    const afterOwnerBalance = await this.token.balanceOf(owner);

    const balanceAfterRefund = web3.eth.getBalance(investor);
    balanceBeforeInvestment.should.be.bignumber.equal(balanceAfterRefund);
  });
});
