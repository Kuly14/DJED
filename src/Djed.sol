// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "./Token.sol";

contract Djed is Token {
    constructor(string memory _name, string memory _symbol)
        Token(_name, _symbol)
    {}
}
