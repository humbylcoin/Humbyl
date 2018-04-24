pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/token/ERC20/PausableToken.sol';

contract HumbylCoin is PausableToken {
    string public constant name = "Humbyl Coin";
    string public constant symbol = "HBL";
    uint8 public constant decimals = 18;
    uint256 public constant initialSupply = 1000000000;
    uint256 public rankBase;

    event Rank(address indexed iOwner, address owner, uint256 amount, uint256 timestamp);

    uint256 public constant TOTAL_SUPPLY = initialSupply * (10 ** uint256(decimals));
    uint256 public constant INIT_RANK_BASE = 20000 * (10 ** uint256(decimals));  // 20k

    function HumbylCoin() public {
        totalSupply_ = TOTAL_SUPPLY;
        balances[msg.sender] = TOTAL_SUPPLY;
        rankBase = INIT_RANK_BASE;
        Transfer(0x0, msg.sender, TOTAL_SUPPLY);
    }

    function checkRank(address _owner) internal {
        uint256 amount = balances[_owner];
        if(amount >= rankBase) {
            Rank(_owner, _owner, amount, now);
        }
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        bool success = super.transferFrom(_from, _to, _value);
        checkRank(_from);
        checkRank(_to);
        return success;
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        bool success = super.transfer(_to, _value);
        checkRank(msg.sender);
        checkRank(_to);
        return success;
    }

    function updateRankBase(uint256 _rankBase) onlyOwner public {
        rankBase = _rankBase;
    }
}