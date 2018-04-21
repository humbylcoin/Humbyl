pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./HumbylCoin.sol";


contract HumbylPresale is Ownable, CappedCrowdsale {

  mapping(address => bool) public whitelist;
  uint256 public constant MIN_PUT = 2345 * (10 ** uint256(15));

  function HumbylPresale(uint256 _rate, address _wallet, HumbylCoin _token, uint256 _cap) public
    Crowdsale(_rate, _wallet, _token)
    CappedCrowdsale(_cap)
  {
  }

  /*function HumbylPresale() public
      Crowdsale(4321, address(0xaa2b65eeA50Eb267406a2fc4CAe065c6DfDf4304), HumbylCoin(0x2CEc5169e45F0B56c69fE1082402C48f757c34f4))
      CappedCrowdsale(5000000 * (10 ** uint256(18)) / 4321)
    {
    }*/

  bool public isFinalized = false;

  event Finalized();

  /**
   * @dev Calls the contract's finalization function.
   */
  function finalize() onlyOwner external {
    require(!isFinalized);

    finalization();
    Finalized();

    isFinalized = true;
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
    _returnTokens();
  }

  function _preValidatePurchase(address _beneficiary, uint256 _weiAmount) internal {
      super._preValidatePurchase(_beneficiary, _weiAmount);
      require(_weiAmount >= MIN_PUT);
      bool allowed = whitelist[_beneficiary];
      require(allowed);
      require(!isFinalized);
  }

  function allow(address _beneficiary, bool allowed) onlyOwner external {
      whitelist[_beneficiary] = allowed;
  }

}
