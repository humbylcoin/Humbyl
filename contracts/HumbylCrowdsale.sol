pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/distribution/RefundableCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/price/IncreasingPriceCrowdsale.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./HumbylCoin.sol";


contract HumbylCrowdsale is CappedCrowdsale, RefundableCrowdsale, IncreasingPriceCrowdsale {
    using SafeMath for uint256;
    mapping(address => bool) public whitelist;
    mapping(address => bool) public operators;
    mapping(address => uint256) public deliveredTokens;

    uint256 public minPut = 3 * (10 ** uint256(18)); // 3ETH

    // for test
    /*
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
    */

    // for ICO

    function HumbylCrowdsale() public
    Crowdsale(uint256(2678), address(0xaa2b65eea50eb267406a2fc4cae065c6dfdf4304), HumbylCoin(0xc371b3853b942F41384fE1639F2784B56a549871))
    CappedCrowdsale(54000 * (10 ** uint256(18)))
    TimedCrowdsale(uint256(1526967000), uint256(1535785199))
    RefundableCrowdsale(3000 * (10 ** uint256(18)))
    IncreasingPriceCrowdsale(uint256(2678), uint256(1339))
    {
    }


    // for dev
    /*
    function HumbylCrowdsale() public
    Crowdsale(uint256(2678), address(0xaa2b65eea50eb267406a2fc4cae065c6dfdf4304), HumbylCoin(0xf204a4ef082f5c04bb89f7d5e6568b796096735a))
    CappedCrowdsale(54000 * (10 ** uint256(18)))
    TimedCrowdsale(uint256(1526899975), uint256(1535785199))
    RefundableCrowdsale(3000 * (10 ** uint256(18)))
    IncreasingPriceCrowdsale(uint256(2678), uint256(1339))
    {
    }
    */

    /**
     * @dev Source of tokens. Override this method to modify the way in which the crowdsale ultimately gets and sends its tokens.
     * @param _beneficiary Address performing the token purchase
     * @param _tokenAmount Number of tokens to be emitted
     */
    function _deliverTokens(address _beneficiary, uint256 _tokenAmount) internal {
        address _owner = HumbylCoin(token).owner();
        token.transferFrom(_owner, _beneficiary, _tokenAmount);
        deliveredTokens[_beneficiary] = deliveredTokens[_beneficiary].add(_tokenAmount);
    }

    /**
     * @dev validate minimum put amount and whitelist.
     * @param _beneficiary Address performing the token purchase
     * @param _weiAmount Value in wei involved in the purchase
     */
    function _preValidatePurchase(address _beneficiary, uint256 _weiAmount) internal {
        super._preValidatePurchase(_beneficiary, _weiAmount);
        require(_weiAmount >= minPut);
        bool allowed = whitelist[_beneficiary];
        require(allowed);
    }

    /**
     * @dev add or remove an operator
     * @param _beneficiary Address of the operator being added or removed
     * @param _approved Bool indicates add or remove
     */
    function approve(address _beneficiary, bool _approved) onlyOwner external {
        operators[_beneficiary] = _approved;
    }

    event Allowed(address beneficiary, bool allowed);

    /**
     * @dev add or remove an address from whitelist
     * @param _beneficiary Address of the operator being added or removed
     * @param _allowed Bool indicates add or remove
     */
    function allow(address _beneficiary, bool _allowed) external {
        bool could = operators[msg.sender];
        require(could || (owner == msg.sender));
        whitelist[_beneficiary] = _allowed;
        Allowed(_beneficiary, _allowed);
    }

    /**
     * @dev Adds list of addresses to whitelist. Not overloaded due to limitations with truffle testing.
     * @param _beneficiaries Addresses to be added to the whitelist
     */
    function allowMany(address[] _beneficiaries, bool _allowed) external {
        bool could = operators[msg.sender];
        require(could || (owner == msg.sender));
        for (uint256 i = 0; i < _beneficiaries.length; i++) {
            whitelist[_beneficiaries[i]] = _allowed;
            Allowed(_beneficiaries[i], _allowed);
        }
    }

    /**
     * @dev setter for minPut
     */
    function setMinPut(uint256 _minPut) onlyOwner external {
        minPut = _minPut;
    }
}
