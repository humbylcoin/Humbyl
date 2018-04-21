import decodeLogs from '../node_modules/zeppelin-solidity/test/helpers/decodeLogs';
import EVMRevert from '../node_modules/zeppelin-solidity/test/helpers/EVMRevert';
const HumbylCoin = artifacts.require('HumbylCoin');
require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(web3.BigNumber))
    .should();

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


contract('HumbylCoin', accounts => {
  let token;
  const creator = accounts[0];
  const account1 = accounts[1];
  const account2 = accounts[2];
  const allEvents = [];

  beforeEach(async function () {
    token = await HumbylCoin.new({ from: creator });
    token.allEvents(function(error, event) {
        if(!error) {
            if(event) {
                allEvents.push(event);
            }
        }
    })
  });

  it('has a name', async function () {
    const name = await token.name();
    assert.equal(name, 'Humbyl Coin');
  });

  it('has a symbol', async function () {
    const symbol = await token.symbol();
    assert.equal(symbol, 'HBL');
  });

  it('has 18 decimals', async function () {
    const decimals = await token.decimals();
    assert(decimals.eq(18));
  });

  it('assigns the initial total supply to the creator', async function () {
    const totalSupply = await token.totalSupply();
    const creatorBalance = await token.balanceOf(creator);
    const INIT_RANK_BASE = await token.INIT_RANK_BASE();
    const rankBase = await token.rankBase();

    assert(creatorBalance.eq(totalSupply));
    assert(INIT_RANK_BASE.eq(rankBase));
    const receipt = web3.eth.getTransactionReceipt(token.transactionHash);
    const logs = decodeLogs(receipt.logs, HumbylCoin, token.address);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].event, 'Transfer');
    assert.equal(logs[0].args.from.valueOf(), 0x0);
    assert.equal(logs[0].args.to.valueOf(), creator);
    assert(logs[0].args.value.eq(totalSupply));
  });

    it('test updateRankBase', async function () {
        var newRankBase = new web3.BigNumber(3343);
        await token.updateRankBase(newRankBase, {from: account1}).should.be.rejectedWith(EVMRevert);
        //
        var success = await token.updateRankBase(newRankBase);
        assert(success)
        var rankBase = await token.rankBase();
        assert.equal(newRankBase.valueOf(), rankBase.valueOf());
    });

    it('rank events in transfer', async function () {
        //one rank event in transfer
        await sleep(1000);
        allEvents.length = 0;
        var rankBase = await token.rankBase();
        var transferAmount = rankBase.sub(new web3.BigNumber(1));
        var creatorBalance = await token.balanceOf(creator);
        creatorBalance = creatorBalance.sub(transferAmount);
        var success = await token.transfer(account1, transferAmount);
        assert(success);
        await sleep(1000);
        //
        var receiverBalance = await token.balanceOf(account1);
        assert.equal(receiverBalance.valueOf(), transferAmount.valueOf());
        assert.equal(allEvents.length, 2);
        assert.equal(allEvents[1].event, 'Rank');
        assert.equal(allEvents[1].args.owner.valueOf(), creator);
        assert.equal(allEvents[1].args.amount.valueOf(), creatorBalance.valueOf());
        //two rank events in transfer
        allEvents.length = 0;
        transferAmount = new web3.BigNumber(1);
        creatorBalance = await token.balanceOf(creator);
        creatorBalance = creatorBalance.sub(transferAmount);
        success = await token.transfer(account1, transferAmount);
        assert(success);
        await sleep(1000);
        //
        receiverBalance = await token.balanceOf(account1);
        assert.equal(receiverBalance.valueOf(), rankBase.valueOf());
        assert.equal(allEvents.length, 3);
        assert.equal(allEvents[1].event, 'Rank');
        assert.equal(allEvents[1].args.owner.valueOf(), creator);
        assert.equal(allEvents[1].args.amount.valueOf(), creatorBalance.valueOf());

        assert.equal(allEvents[2].event, 'Rank');
        assert.equal(allEvents[2].args.owner.valueOf(), account1);
        assert.equal(allEvents[2].args.amount.valueOf(), rankBase.valueOf());

    });

    it('rank events in transferFrom', async function () {
        var rankBase = await token.rankBase();
        var transferAmount = rankBase.mul(new web3.BigNumber(4));
        var success = await token.transfer(account1, transferAmount);
        assert(success);
        var success = await token.approve(creator, transferAmount, {from: account1});
        assert(success);
        //one rank event in transfer
        await sleep(1000);
        allEvents.length = 0;
        var transferAmount = rankBase.sub(new web3.BigNumber(1));
        var creatorBalance = await token.balanceOf(account1);
        creatorBalance = creatorBalance.sub(transferAmount);
        var success = await token.transferFrom(account1, account2, transferAmount);
        assert(success);
        await sleep(1000);
        //
        var receiverBalance = await token.balanceOf(account2);
        assert.equal(receiverBalance.valueOf(), transferAmount.valueOf());
        assert.equal(allEvents.length, 2);
        assert.equal(allEvents[1].event, 'Rank');
        assert.equal(allEvents[1].args.owner.valueOf(), account1);
        assert.equal(allEvents[1].args.amount.valueOf(), creatorBalance.valueOf());
        //two rank events in transfer
        allEvents.length = 0;
        transferAmount = new web3.BigNumber(1);
        creatorBalance = await token.balanceOf(account1);
        creatorBalance = creatorBalance.sub(transferAmount);
        success = await token.transferFrom(account1, account2, transferAmount);
        assert(success);
        await sleep(1000);
        //
        receiverBalance = await token.balanceOf(account2);
        assert.equal(receiverBalance.valueOf(), rankBase.valueOf());
        assert.equal(allEvents.length, 3);
        assert.equal(allEvents[1].event, 'Rank');
        assert.equal(allEvents[1].args.owner.valueOf(), account1);
        assert.equal(allEvents[1].args.amount.valueOf(), creatorBalance.valueOf());

        assert.equal(allEvents[2].event, 'Rank');
        assert.equal(allEvents[2].args.owner.valueOf(), account2);
        assert.equal(allEvents[2].args.amount.valueOf(), rankBase.valueOf());

    });

});
