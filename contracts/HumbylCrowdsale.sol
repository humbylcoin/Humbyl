pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/distribution/RefundableCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/price/IncreasingPriceCrowdsale.sol";
import "./HumbylCoin.sol";


contract HumbylCrowdsale is CappedCrowdsale, RefundableCrowdsale, IncreasingPriceCrowdsale {

    mapping(address => bool) public whitelist;
    mapping(address => bool) public operators;
    uint256 public minPut = 2345 * (10 ** uint256(15));

    function HumbylCrowdsale(uint256 _openingTime, uint256 _closingTime, address _wallet,
    HumbylCoin _token, uint256 _goal, uint256 _cap, uint256 _initialRate, uint256 _finalRate) public
    Crowdsale(_initialRate, _wallet, _token)
    CappedCrowdsale(_cap)
    TimedCrowdsale(_openingTime, _closingTime)
    RefundableCrowdsale(_goal)
    IncreasingPriceCrowdsale(_initialRate, _finalRate)
    {
        require(_goal <= _cap);
    }

    /**
     * @dev Source of tokens. Override this method to modify the way in which the crowdsale ultimately gets and sends its tokens.
     * @param _beneficiary Address performing the token purchase
     * @param _tokenAmount Number of tokens to be emitted
     */
    function _deliverTokens(address _beneficiary, uint256 _tokenAmount) internal {
        token.transferFrom(HumbylCoin(token).owner(), _beneficiary, _tokenAmount);
    }

    function _preValidatePurchase(address _beneficiary, uint256 _weiAmount) internal {
        super._preValidatePurchase(_beneficiary, _weiAmount);
        require(_weiAmount >= minPut);
        bool allowed = whitelist[_beneficiary];
        require(allowed);
    }

    /**
     * @dev add or remove an operator
     */
    function approve(address _beneficiary, bool _approved) onlyOwner external {
        operators[_beneficiary] = _approved;
    }

    /**
     * @dev add or remove from whitelist
     */
    function allow(address _beneficiary, bool _allowed) external {
        bool could = operators[msg.sender];
        require(could || (owner == msg.sender));
        whitelist[_beneficiary] = _allowed;
    }

    /**
     * @dev setter for minPut
     */
    function setMinPut(uint256 _minPut) onlyOwner external {
        minPut = _minPut;
    }
}
