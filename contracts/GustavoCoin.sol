pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/token/ERC20/MintableToken.sol';

contract GustavoCoin is MintableToken {
  string public name = "GUSTAVO COIN";
  string public symbol = "GUS";
  uint8 public decimals = 18;

  function GustavoCoin() MintableToken() public {
      totalSupply_ = 100000000000000000;
      balances[msg.sender] = totalSupply_;
  }
}