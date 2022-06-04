// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.7;

contract AggregatorV3Mock {
    int public price = 30000 * 10**8;

    function changeRoundData(int newPrice) external {
        price = newPrice;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80,
            int256 answer,
            uint256,
            uint256,
            uint80
        )
    {
        return (0, price, 0, 0, 0);
    }
}
