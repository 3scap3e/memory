// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
// Local test token only. Anyone can mint; it has no value.
contract MockUSDC {
    string public constant name = "Memory Test USDC";
    string public constant symbol = "mUSDC";
    uint8 public constant decimals = 6;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    event Transfer(address indexed from, address indexed to, uint256 value);
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount; totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient test USDC");
        balanceOf[msg.sender] -= amount; balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount); return true;
    }
}
