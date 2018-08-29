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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const HumbylCoin = artifacts.require('HumbylCoin');
const HumbylBridge = artifacts.require('HumbylBridge');
const RATE = new BigNumber(1339);

contract('HumbylBridge', function ([owner, wallet, investor]) {
    const allEvents = [];
    const verifyEvents = async function(eventExpects, length) {
        // [{index, args: {}, name}] || {index, args, name} || {args, name}
        await sleep(500);
        if(typeof eventExpects.length == 'undefined') {
            eventExpects = [eventExpects]
        }
        eventExpects.forEach(function(eventExpect) {
            if(!eventExpect.hasOwnProperty('index')) {
                eventExpect.index = 0
            }
            assert(eventExpect.index < allEvents.length, 'index out of bound: ' + eventExpect.index)
            var event = allEvents[eventExpect.index]
            //name
            assert(!eventExpect.name || eventExpect.name == event.event, event.event + ' != ' + eventExpect.name)
            if(eventExpect.args) {
                for (var key in eventExpect.args) {
                    var value = eventExpect.args[key]
                    if(value instanceof BigNumber) {
                        event.args[key].should.be.bignumber.equal(value);
                    } else {
                        assert.equal(value, event.args[key])
                    }
                }
            }
        });
        if(typeof length !== 'undefined') {
            assert.equal(allEvents.length, length)
        }
    }
  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async function () {
    this.token = await HumbylCoin.new({ from: owner });
    this.bridge = await HumbylBridge.new(wallet, this.token.address, RATE, { from: owner });
    allEvents.length = 0;
    this.bridge.allEvents(function(error, event) {
        if(!error) {
            if(event) {
                allEvents.push(event);
            }
        }
    })
  });

  it('should create bridge with correct parameters', async function () {
    this.bridge.should.exist;
    this.token.should.exist;

    const walletAddress = await this.bridge.wallet();
    const tokenAddress = await this.bridge.token();
    const o = await this.bridge.owner();
    const rate = await this.bridge.rate();

    walletAddress.should.be.equal(wallet);
    tokenAddress.should.be.equal(this.token.address);
    o.should.be.equal(owner);
    rate.should.be.bignumber.equal(RATE);
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

    it('test setRate', async function () {
        var rate = await this.bridge.rate();
        var new_rate = 1234;
        rate.should.be.bignumber.equal(RATE);
        rate = new BigNumber(new_rate);
        await this.bridge.setRate(rate, { from: investor}).should.be.rejectedWith(EVMRevert);
        await this.bridge.setRate(rate, { from: owner});
        rate = await this.bridge.rate();
        rate.should.be.bignumber.equal(new_rate);
    });

  it('test withdraw for owner', async function () {
      const initAllowance = new BigNumber(1000);
      const totalBalance = initAllowance.mul(5);
      const identity = new BigNumber(1);
      var weiAmount = new BigNumber(1);
      // transfer totalBalance tokens into the wallet
      await this.token.transfer(wallet, totalBalance, { from: owner});
      var balance = await this.token.balanceOf(wallet);
      balance.should.be.bignumber.equal(totalBalance);
      //
      await this.token.approve(this.bridge.address, initAllowance, { from: wallet});
      var allowance = await this.token.allowance(wallet, this.bridge.address);
      allowance.should.be.bignumber.equal(initAllowance);
      // not owner
      await this.bridge.withdraw(investor, identity, weiAmount, { from: investor}).should.be.rejectedWith(EVMRevert);
      // success
      await this.bridge.withdraw(investor, identity, weiAmount, { from: owner});
      var walletBalance = await this.token.balanceOf(wallet);
      walletBalance.should.be.bignumber.equal(totalBalance.minus(weiAmount));
      var balance = await this.token.balanceOf(investor);
      balance.should.be.bignumber.equal(weiAmount);
      await verifyEvents({name: 'Withdraw', args: {beneficiary: investor, identity: identity, amount: weiAmount}}, 1)
      // insufficient balance
      await this.bridge.withdraw(investor, identity, initAllowance, { from: owner}).should.be.rejectedWith(EVMRevert);
      // success
      allEvents.length = 0
      weiAmount = initAllowance.minus(weiAmount)
      await this.bridge.withdraw(investor, identity, weiAmount, { from: owner});
      var allowance = await this.token.allowance(wallet, this.bridge.address);
      allowance.should.be.bignumber.equal(0);
      var balance = await this.token.balanceOf(investor);
      balance.should.be.bignumber.equal(initAllowance);
      await verifyEvents({name: 'Withdraw', args: {beneficiary: investor, identity: identity, amount: weiAmount}}, 1)
  });
    it('test withdraw for operator', async function () {
        const initAllowance = new BigNumber(1000);
        const totalBalance = initAllowance.mul(5);
        const identity = new BigNumber(1);
        const weiAmount = new BigNumber(1);
        // transfer totalBalance tokens into the wallet
        await this.token.transfer(wallet, totalBalance, { from: owner});
        var balance = await this.token.balanceOf(wallet);
        balance.should.be.bignumber.equal(totalBalance);
        //
        await this.token.approve(this.bridge.address, initAllowance, { from: wallet});
        var allowance = await this.token.allowance(wallet, this.bridge.address);
        allowance.should.be.bignumber.equal(initAllowance);
        // not operator
        await this.bridge.withdraw(investor, identity, weiAmount, { from: investor}).should.be.rejectedWith(EVMRevert);
        // success
        await this.bridge.approve(investor, true, { from: owner});
        await this.bridge.withdraw(investor, identity, weiAmount, { from: investor});
        var walletBalance = await this.token.balanceOf(wallet);
        walletBalance.should.be.bignumber.equal(totalBalance.minus(weiAmount));
        var allowance = await this.token.allowance(wallet, this.bridge.address);
        allowance.should.be.bignumber.equal(initAllowance.minus(weiAmount));
        var balance = await this.token.balanceOf(investor);
        balance.should.be.bignumber.equal(weiAmount);
    });

    it('test buyCredits', async function () {
        var ethAmount = new BigNumber(0);
        var identity = new BigNumber(1);
        const rate = await this.bridge.rate();
        var ethCredits = await this.bridge.ethCredits();
        ethCredits.should.be.bignumber.equal(new BigNumber(0));
        // fail
        await this.bridge.buyCredits(identity, { value: ethAmount, from: investor }).should.be.rejectedWith(EVMRevert);
        // success
        ethAmount = new BigNumber(1);
        var creditAmount = ethAmount.mul(rate);
        await this.bridge.buyCredits(identity, { value: ethAmount, from: investor }).should.be.fulfilled;
        var args = {from: investor, identity: identity, ethAmount: ethAmount, creditAmount: creditAmount};
        var ethCredits = await this.bridge.ethCredits();
        ethCredits.should.be.bignumber.equal(creditAmount);
        await verifyEvents({name: 'BoughtCredits', args: args}, 1)
        //
        await this.bridge.buyCredits(identity, { value: ethAmount, from: investor }).should.be.fulfilled;
        var ethCredits = await this.bridge.ethCredits();
        ethCredits.should.be.bignumber.equal(creditAmount.mul(2));
    });

    it('test buyCreditsRate', async function () {
        var ethAmount = new BigNumber(1);
        var identity = new BigNumber(1);
        var rate = await this.bridge.rate();
        rate = rate.minus(new BigNumber(1));
        // fail
        await this.bridge.buyCreditsRate(identity, rate, { value: ethAmount, from: investor }).should.be.rejectedWith(EVMRevert);
        // success
        rate = rate.add(new BigNumber(1));
        var creditAmount = ethAmount.mul(rate);
        await this.bridge.buyCreditsRate(identity, rate, { value: ethAmount, from: investor }).should.be.fulfilled;
        var args = {from: investor, identity: identity, ethAmount: ethAmount, creditAmount: creditAmount};
        await verifyEvents({name: 'BoughtCredits', args: args}, 1)
    });

    it('test sellCredits for owner and operator', async function () {
        const ethAmount = new BigNumber(1);
        const beneficiary = wallet;
        var creditAmount = RATE;
        const identity = new BigNumber(1);
        var beneficiaryBalance = await web3.eth.getBalance(beneficiary);
        // not enough eth balance
        var balance = await web3.eth.getBalance(this.bridge.address);
        balance.should.be.bignumber.equal(new BigNumber(0));
        await this.bridge.sellCredits(identity, beneficiary, creditAmount, { from: owner}).should.be.rejectedWith(EVMRevert);
        balance = await web3.eth.getBalance(beneficiary);
        balance.should.be.bignumber.equal(beneficiaryBalance);
        // success
        await this.bridge.deposit({from: owner, value: ethAmount}).should.be.fulfilled;
        var balance = await web3.eth.getBalance(this.bridge.address);
        balance.should.be.bignumber.equal(ethAmount);
        await this.bridge.sellCredits(identity, beneficiary, creditAmount, { from: investor}).should.be.rejectedWith(EVMRevert);
        var ethCredits = await this.bridge.ethCredits();
        ethCredits.should.be.bignumber.equal(new BigNumber(0));
        await this.bridge.sellCredits(identity, beneficiary, creditAmount, { from: owner}).should.be.fulfilled;
        ethCredits = await this.bridge.ethCredits();
        ethCredits.should.be.bignumber.equal(new BigNumber(-creditAmount));
        beneficiaryBalance = beneficiaryBalance.add(ethAmount);
        balance = await web3.eth.getBalance(beneficiary);
        balance.should.be.bignumber.equal(beneficiaryBalance);
        var balance = await web3.eth.getBalance(this.bridge.address);
        balance.should.be.bignumber.equal(new BigNumber(0));
        await verifyEvents({name: 'SoldCredits', args: {beneficiary: beneficiary, identity: identity, creditAmount: creditAmount, ethAmount: ethAmount}}, 1);
        // not enough credit balance
        allEvents.length = 0;
        await this.bridge.deposit({from: owner, value: ethAmount}).should.be.fulfilled;
        creditAmount = creditAmount.minus(new BigNumber(1));
        await this.bridge.sellCredits(identity, beneficiary, creditAmount, { from: owner}).should.be.rejectedWith(EVMRevert);
        creditAmount = creditAmount.add(new BigNumber(1));
        await this.bridge.sellCredits(identity, beneficiary, creditAmount, { from: owner}).should.be.fulfilled;
        ethCredits = await this.bridge.ethCredits();
        ethCredits.should.be.bignumber.equal(new BigNumber(-2 * creditAmount));
        beneficiaryBalance = beneficiaryBalance.add(ethAmount);
        balance = await web3.eth.getBalance(beneficiary);
        balance.should.be.bignumber.equal(beneficiaryBalance);
        await verifyEvents({name: 'SoldCredits', args: {beneficiary: beneficiary, identity: identity, creditAmount: creditAmount, ethAmount: ethAmount}}, 1);
        // operator
        allEvents.length = 0;
        await this.bridge.deposit({from: owner, value: ethAmount}).should.be.fulfilled;
        await this.bridge.sellCredits(identity, beneficiary, creditAmount, { from: investor}).should.be.rejectedWith(EVMRevert);
        await this.bridge.approve(investor, true, { from: owner}).should.be.fulfilled;
        await this.bridge.sellCredits(identity, beneficiary, creditAmount, { from: investor}).should.be.fulfilled;
        beneficiaryBalance = beneficiaryBalance.add(ethAmount);
        balance = await web3.eth.getBalance(beneficiary);
        balance.should.be.bignumber.equal(beneficiaryBalance);
        await verifyEvents({name: 'SoldCredits', args: {beneficiary: beneficiary, identity: identity, creditAmount: creditAmount, ethAmount: ethAmount}}, 1);
    });

    it('test withdrawETH', async function () {
        var ethAmount = new BigNumber(1);
        const beneficiary = wallet;
        var beneficiaryBalance = await web3.eth.getBalance(beneficiary);
        // not enough ETH
        var balance = await web3.eth.getBalance(this.bridge.address);
        await this.bridge.withdrawETH(beneficiary, ethAmount, {from: owner }).should.be.rejectedWith(EVMRevert);
        balance.should.be.bignumber.equal(new BigNumber(0));
        balance = await web3.eth.getBalance(beneficiary);
        balance.should.be.bignumber.equal(beneficiaryBalance);
        // success
        await this.bridge.deposit({from: owner, value: ethAmount}).should.be.fulfilled;
        balance = await web3.eth.getBalance(this.bridge.address);
        balance.should.be.bignumber.equal(ethAmount);
        await this.bridge.withdrawETH(beneficiary, ethAmount, {from: investor }).should.be.rejectedWith(EVMRevert);
        await this.bridge.withdrawETH(beneficiary, ethAmount, {from: owner }).should.be.fulfilled;
        balance = await web3.eth.getBalance(this.bridge.address);
        balance.should.be.bignumber.equal(new BigNumber(0));
        beneficiaryBalance = beneficiaryBalance.add(ethAmount);
        balance = await web3.eth.getBalance(beneficiary);
        balance.should.be.bignumber.equal(beneficiaryBalance);
    });

});
