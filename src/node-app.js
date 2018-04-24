#!/usr/bin/env node

var Web3 = require('../node_modules/web3/index.js');
var web3 = new Web3();

//https://api.myetherapi.com/rop
web3.setProvider(new web3.providers.HttpProvider('https://api.myetherapi.com/eth'));

var coinbase = web3.eth.coinbase;
console.log(coinbase);

var balance = web3.eth.getBalance(coinbase);
console.log(balance.toString(10));

