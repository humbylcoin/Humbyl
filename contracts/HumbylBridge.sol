pragma solidity ^0.4.24;

import "zeppelin-solidity/contracts/lifecycle/Destructible.sol";
import "zeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";


contract HumbylBridge is Destructible {
    using SafeMath for uint256;
    address public wallet;
    ERC20 public token;
    uint256 public rate; // tokens per ETH
    int256 public ethCredits; // credits bought from ETH
    mapping(address => bool) public operators;

    event BoughtCredits(address indexed from, uint256 indexed identity, uint256 ethAmount, uint256 creditAmount);
    event Withdraw(address indexed beneficiary, uint256 indexed identity, uint256 amount);
    event SoldCredits(uint256 indexed identity, address indexed beneficiary, uint256 creditAmount, uint256 ethAmount);

    function toUint(bytes _bytes, uint _start) internal pure returns (uint256) {
        require(_bytes.length >= (_start + 32));
        uint256 tempUint;

        assembly {
            tempUint := mload(add(add(_bytes, 0x20), _start))
        }

        return tempUint;
    }

    /**
     * @dev set a new wallet address
     * @param _wallet Address
     */
    function setWallet(address _wallet) onlyOwner external {
        wallet = _wallet;
    }

    /**
     * @dev set a new rate
     * @param _rate Uint256
     */
    function setRate(uint256 _rate) onlyOwner external {
        require(_rate > 0);
        rate = _rate;
    }

    /**
     * @dev constructor
     * @param _wallet Address of the token bank which should give allowance to this contract
     * @param _token Address of the token
     */
    constructor(address _wallet, ERC20 _token, uint256 _rate) public
    {
        wallet = _wallet;
        token = _token;
        rate = _rate;
    }

    /*constructor() public
    {
        wallet = address(0xaa2b65eeA50Eb267406a2fc4CAe065c6DfDf4304);
        address _token = address(0xa590356dea66722dce7f9cab645f584a358a39a1);
        token = ERC20(_token);
        rate = 1339;
    }*/

    /**
     * @dev add or remove an operator
     * @param _beneficiary Address of the operator being added or removed
     * @param _approved Bool indicates add or remove
     */
    function approve(address _beneficiary, bool _approved) onlyOwner external {
        operators[_beneficiary] = _approved;
    }

    /**
     * @dev buy credits with ETH via the bank
     * @param _from Address of the sender
     * @param _ethAmount Uint256 the wei amount of ETH from the sender
     * @param _identity Uint256 the identity of the beneficiary
     */
    function _buyCredits(address _from, uint256 _ethAmount, uint256 _identity) internal {
        uint256 _creditAmount = _ethAmount.mul(rate);
        require(_creditAmount > 0);
        ethCredits += int256(_creditAmount);
        emit BoughtCredits(_from, _identity, _ethAmount, _creditAmount);
    }

    /**
     * @dev buy credits with ETH via the bank
     * @param _identity Uint256 the identity of the beneficiary
     */
    function buyCredits(uint256 _identity) external payable {
        _buyCredits(msg.sender, msg.value, _identity);
    }

    /**
     * @dev buy credits with ETH via the bank
     * @param _identity Uint256 the identity of the beneficiary
     * @param _rate Uint256 preset rate for this operation
     */
    function buyCreditsRate(uint256 _identity, uint256 _rate) external payable {
        require(rate == _rate);
        _buyCredits(msg.sender, msg.value, _identity);
    }

    /**
     * @dev fallback function
     */
    function () external payable {
        require(msg.data.length == 32);
        _buyCredits(msg.sender, msg.value, toUint(msg.data, 0));
    }

    /**
     * @dev withdraw tokens from credits via the bank
     * @param _beneficiary Address of the token receiver
     * @param _identity Uint256 the identity of the beneficiary
     * @param _weiAmount Uint256 the amount of tokens in wei
     */
    function withdraw(address _beneficiary, uint256 _identity, uint256 _weiAmount) external {
        bool could = operators[msg.sender];
        require(could || (owner == msg.sender));
        token.transferFrom(wallet, _beneficiary, _weiAmount);
        emit Withdraw(_beneficiary, _identity, _weiAmount);
    }

    /**
     * @dev sell credits to ETH via the bank
     * @param _identity Uint256 the identity of the beneficiary
     * @param _beneficiary Address of the token receiver
     * @param _creditAmount Uint256 the amount of tokens in wei
     */
    function _sellCredits(uint256 _identity, address _beneficiary, uint256 _creditAmount) internal {
        bool could = operators[msg.sender];
        require(could || (owner == msg.sender));
        uint256 _ethAmount = _creditAmount.div(rate);
        require(_ethAmount > 0);
        ethCredits -= int256(_creditAmount);
        _beneficiary.transfer(_ethAmount);
        emit SoldCredits(_identity, _beneficiary, _creditAmount, _ethAmount);
    }

    /**
     * @dev sell credits to ETH via the bank
     * @param _identity Uint256 the identity of the beneficiary
     * @param _beneficiary Address of the token receiver
     * @param _creditAmount Uint256 the amount of tokens in wei
     */
    function sellCredits(uint256 _identity, address _beneficiary, uint256 _creditAmount) external {
        _sellCredits(_identity, _beneficiary, _creditAmount);
    }

    /**
     * @dev sell credits to ETH via the bank
     * @param _identity Uint256 the identity of the beneficiary
     * @param _beneficiary Address of the token receiver
     * @param _creditAmount Uint256 the amount of tokens in wei
     * @param _rate Uint256 preset rate for this operation
     */
    function sellCreditsRate(uint256 _identity, address _beneficiary, uint256 _creditAmount, uint256 _rate) external {
        require(rate == _rate);
        _sellCredits(_identity, _beneficiary, _creditAmount);
    }

    /**
     * @dev withdraw ETH from this contract
     * @param _beneficiary Address of the receiver
     * @param _amount Uint256 ETH amount in wei
     */
    function withdrawETH(address _beneficiary, uint256 _amount) onlyOwner external {
        _beneficiary.transfer(_amount);
    }

    /**
     * @dev deposit ETH to this contract
     */
    function deposit() external payable {
    }
}
