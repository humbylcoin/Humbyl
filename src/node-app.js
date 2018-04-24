#!/usr/bin/env node

var Web3 = require('../node_modules/web3/index.js');
var web3 = new Web3();
/*
Owner wallet address = 0x36Ca37CDEa2D1f962394f1CaAF04fe68AEab16a9
Humbyl contract address = 0xedf39a0339b2ca9265ff7075aa88cf193089b1da
Presale contract address = 0x011047B6adA18D9028D2cF5077eB40E5D5BCF115
 */
// private key
var privateKey = 'cd7611709a5d2f6bed6c191d7e34ea196317115da86034e38028ac0bb66e56c2'

//https://api.myetherapi.com/rop
web3.setProvider(new web3.providers.HttpProvider('https://api.myetherapi.com/eth'));

var coinbase = web3.eth.coinbase;
console.log(coinbase);

var balance = web3.eth.getBalance(coinbase);
console.log(balance.toString(10));

