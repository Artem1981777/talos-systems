// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AgentIdentity {
    string public name;
    address public owner;

    constructor(string memory _name) {
        owner = msg.sender;
        name = _name;
    }

    function setName(string memory _name) external {
        require(msg.sender == owner, "Only owner");
        name = _name;
    }
}
