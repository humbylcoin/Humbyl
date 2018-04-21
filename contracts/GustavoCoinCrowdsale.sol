pragma solidity ^0.4.18;

import './GustavoCoin.sol';
import 'zeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol';


contract GustavoCoinCrowdsale is TimedCrowdsale {

  function GustavoCoinCrowdsale(uint256 _startTime, uint256 _endTime, uint256 _rate, address _wallet) public
    Crowdsale(_rate, _wallet, new GustavoCoin()) TimedCrowdsale(_startTime, _endTime) {
  }

  // creates the token to be sold.
  // override this method to have crowdsale of a specific MintableToken token.
  function createTokenContract() internal returns (MintableToken) {
    return new GustavoCoin();
  }

}