pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/lifecycle/Destructible.sol";
import "zeppelin-solidity/contracts/token/ERC20/ERC20.sol";


contract HumbylBridge is Destructible {
    address public wallet;
    ERC20 public token;
    mapping(address => bool) public operators;

    event Withdraw(address indexed beneficiary, uint256 indexed identity, uint256 amount);

    /**
     * @dev set a new wallet address
     * @param _wallet Address
     */
    function setWallet(address _wallet) onlyOwner external {
        wallet = _wallet;
    }

    /**
     * @dev constructor
     * @param _wallet Address of the token bank which should give allowance to this contract
     * @param _token Address of the token
     */
    constructor(address _wallet, ERC20 _token) public
    {
        wallet = _wallet;
        token = _token;
    }

    /*constructor() public
    {
        wallet = address(0x36Ca37CDEa2D1f962394f1CaAF04fe68AEab16a9);
        token = ERC20(0x36Ca37CDEa2D1f962394f1CaAF04fe68AEab16a9);
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
     * @dev withdraw tokens from the bank
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
}
