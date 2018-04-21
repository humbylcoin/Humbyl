pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/distribution/RefundableCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/price/IncreasingPriceCrowdsale.sol";
import "./HumbylCoin.sol";


contract HumbylCrowdsale is CappedCrowdsale, RefundableCrowdsale, IncreasingPriceCrowdsale {

  function HumbylCrowdsale(uint256 _openingTime, uint256 _closingTime, uint256 _rate, address _wallet,
  HumbylCoin _token, uint256 _goal, uint256 _cap, uint256 _initialRate, uint256 _finalRate) public
    Crowdsale(_rate, _wallet, _token)
    CappedCrowdsale(_cap)
    TimedCrowdsale(_openingTime, _closingTime)
    RefundableCrowdsale(_goal)
    IncreasingPriceCrowdsale(_initialRate, _finalRate)
  {
    require(_goal <= _cap);
  }

  /**
     * @dev Return remaining tokens to the owner when finalized
     */
  function _returnTokens() internal {
    uint256 balance = token.balanceOf(this);
    if(balance > 0) {
      token.transfer(HumbylCoin(token).owner(), balance);
    }
  }
  /**
     * @dev vault finalization task, called when owner calls finalize()
     */
  function finalization() internal {
    super.finalization();
    _returnTokens();
  }
}
