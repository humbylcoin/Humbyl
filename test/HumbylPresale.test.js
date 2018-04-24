import ether from '../node_modules/zeppelin-solidity/test/helpers/ether';
import {advanceBlock} from '../node_modules/zeppelin-solidity/test/helpers/advanceToBlock';
import {increaseTimeTo, duration} from '../node_modules/zeppelin-solidity/test/helpers/increaseTime';
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
    const RATE = new BigNumber(4321);
    const CAP = ether(30);
    const MIN_PUT = new BigNumber(2345).mul(new BigNumber('1e+15'));

    before(async function () {
        // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
        await advanceBlock();
    }

    )
    ;

    beforeEach(async function () {
        this.token = await HumbylCoin.new({from: owner});
        this.crowdsale = await HumbylPresale.new(RATE, wallet, this.token.address, CAP);
        await this.token.transfer(this.crowdsale.address, CAP * RATE);
        //await this.token.transferOwnership(this.crowdsale.address);
        //await this.vault.transferOwnership(this.crowdsale.address);
    });

    it('should create crowdsale with correct parameters', async function () {
        this.crowdsale.should.exist;
        this.token.should.exist;

        const rate = await this.crowdsale.rate();
        const walletAddress = await this.crowdsale.wallet();
        const cap = await this.crowdsale.cap();
        const minPut = await this.crowdsale.MIN_PUT();
        const tokenAddress = await this.crowdsale.token()

        rate.should.be.bignumber.equal(RATE);
        walletAddress.should.be.equal(wallet);
        cap.should.be.bignumber.equal(CAP);
        minPut.should.be.bignumber.equal(MIN_PUT);
        tokenAddress.should.be.equal(this.token.address);
    });

    it('test whitelist', async function () {
        var allowed = await this.crowdsale.whitelist(investor);
        allowed.should.be.equal(false);
        var put = MIN_PUT.sub(1);
        await this.crowdsale.sendTransaction({ value: put, from: investor}).should.be.rejectedWith(EVMRevert);
        //
        await this.crowdsale.allow(investor, true, {from: investor}).should.be.rejectedWith(EVMRevert);
        allowed = await this.crowdsale.whitelist(investor);
        allowed.should.be.equal(false);
        await this.crowdsale.allow(investor, true, {from: owner});
        allowed = await this.crowdsale.whitelist(investor);
        allowed.should.be.equal(true);
        //
        put = MIN_PUT;
        await this.crowdsale.sendTransaction({ value: put, from: investor});
        var expectedBalance = new BigNumber(put);
        expectedBalance = expectedBalance.mul(RATE);
        var balance = await this.token.balanceOf(investor);
        balance.should.be.bignumber.equal(expectedBalance);
    });


    it('test min put=2.345 ETH', async function () {
        await this.crowdsale.allow(investor, true, {from: owner});
        var put = MIN_PUT.sub(1);
        await this.crowdsale.sendTransaction({ value: put, from: investor}).should.be.rejectedWith(EVMRevert);
        var balance = await this.token.balanceOf(investor);
        balance.should.be.bignumber.equal(new BigNumber(0))
        //
        put = MIN_PUT;
        var expectedBalance = put;
        expectedBalance = expectedBalance.mul(RATE);
        await this.crowdsale.sendTransaction({ value: put, from: investor});
        balance = await this.token.balanceOf(investor);
        balance.should.be.bignumber.equal(expectedBalance);
    });

    it('test finalize', async function () {
        await this.crowdsale.allow(investor, true, {from: owner});
        var put = MIN_PUT;
        await this.crowdsale.sendTransaction({ value: put, from: investor});
        var balance = await this.token.balanceOf(this.crowdsale.address);
        balance.should.be.bignumber.greaterThan(new BigNumber(0));
        var ownerBalance = await this.token.balanceOf(owner);
        //
        await this.crowdsale.finalize();
        await this.crowdsale.sendTransaction({ value: put, from: investor}).should.be.rejectedWith(EVMRevert);
        var expectedBalance = ownerBalance.add(balance);
        balance = await this.token.balanceOf(this.crowdsale.address);
        balance.should.be.bignumber.equal(new BigNumber(0));
        ownerBalance = await this.token.balanceOf(owner);
        ownerBalance.should.be.bignumber.equal(expectedBalance);
    });

    it('test approve', async function () {
        var is = await this.crowdsale.operators(investor);
        is.should.be.equal(false);
        await this.crowdsale.allow(investor, true, {from: investor}).should.be.rejectedWith(EVMRevert);
        is = await this.crowdsale.whitelist(investor);
        is.should.be.equal(false);
        //
        await this.crowdsale.approve(investor, true, {from: investor}).should.be.rejectedWith(EVMRevert);
        is = await this.crowdsale.operators(investor);
        is.should.be.equal(false);
        //
        await this.crowdsale.approve(investor, true, {from: owner});
        is = await this.crowdsale.operators(investor);
        is.should.be.equal(true);
        await this.crowdsale.allow(investor, true, {from: investor});
        is = await this.crowdsale.whitelist(investor);
        is.should.be.equal(true);
    });

    /*it('should not accept payments before start', async function () {
     await this.crowdsale.send(ether(1)).should.be.rejectedWith(EVMRevert);
     await this.crowdsale.buyTokens(investor, { from: investor, value: ether(1) }).should.be.rejectedWith(EVMRevert);
     });

     it('should accept payments during the sale', async function () {
     const investmentAmount = ether(1);
     const expectedTokenAmount = RATE.mul(investmentAmount);

     await increaseTimeTo(this.openingTime);
     await this.crowdsale.buyTokens(investor, { value: investmentAmount, from: investor }).should.be.fulfilled;

     (await this.token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
     });

     it('should reject payments after end', async function () {
     await increaseTimeTo(this.afterEnd);
     await this.crowdsale.send(ether(1)).should.be.rejectedWith(EVMRevert);
     await this.crowdsale.buyTokens(investor, { value: ether(1), from: investor }).should.be.rejectedWith(EVMRevert);
     });

     it('should reject payments over cap', async function () {
     await increaseTimeTo(this.openingTime);
     await this.crowdsale.send(CAP);
     await this.crowdsale.send(1).should.be.rejectedWith(EVMRevert);
     });

     it('should allow finalization and transfer funds to wallet if the goal is reached', async function () {
     await increaseTimeTo(this.openingTime);
     await this.crowdsale.send(GOAL);

     const beforeFinalization = web3.eth.getBalance(wallet);
     await increaseTimeTo(this.afterClosingTime);
     const beforeOwnerBalance = await this.token.balanceOf(owner);
     const beforeCrowdsaleBalance = await this.token.balanceOf(this.crowdsale.address);
     beforeCrowdsaleBalance.should.be.bignumber.greaterThan(0);

     await this.crowdsale.finalize({ from: owner });
     const afterFinalization = web3.eth.getBalance(wallet);
     const afterOwnerBalance = await this.token.balanceOf(owner);
     const afterCrowdsaleBalance = await this.token.balanceOf(this.crowdsale.address);
     afterCrowdsaleBalance.should.be.bignumber.equal(0);
     beforeOwnerBalance.add(beforeCrowdsaleBalance).should.be.bignumber.equal(afterOwnerBalance)

     afterFinalization.minus(beforeFinalization).should.be.bignumber.equal(GOAL);
     });*/
});
