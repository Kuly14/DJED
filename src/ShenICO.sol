// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "hardhat/console.sol";

interface IToken {
    function burn(uint) external;
}

contract ShenICO is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    event ShenBought(address indexed _buyer, uint indexed _shenAmount);

    AggregatorV3Interface public immutable feed;
    IERC20 public immutable shen;
    IERC20 public immutable wbtc;
    // Price is $4.5
    uint public constant shenPrice = 4e18 + 5e17;

    uint public immutable endTimeStamp = block.timestamp + 5 days;

    constructor(
        AggregatorV3Interface _feed,
        IERC20 _shenAddress,
        IERC20 _wbtcAddress
    ) {
        feed = _feed;
        shen = _shenAddress;
        wbtc = _wbtcAddress;
    }

    modifier icoEnded() {
        require(block.timestamp > endTimeStamp, "ICO: ICO didn't end");
        _;
    }

    function buyShenICO(uint _amount) external nonReentrant {
        require(wbtc.balanceOf(msg.sender) >= _amount, "ICO: Not Enough WBTC");
        require(_amount >= 1e18, "ICO: Too Low");
        uint price = getPrice();
        uint shenAmount = (_amount * shenPrice) / 1e18;
        uint amountInWbtc = (shenAmount * 1e18) / price;
        require(
            shen.balanceOf(address(this)) >= _amount,
            "ICO: Not Enough Shen"
        );
        wbtc.safeTransferFrom(msg.sender, address(this), amountInWbtc);
        shen.safeTransfer(msg.sender, _amount);
        emit ShenBought(msg.sender, _amount);
    }

    function transferWBTC(address _controller) public icoEnded onlyOwner {
        uint bal = shen.balanceOf(address(this));
        if (bal > 0) {
            IToken(address(shen)).burn(bal);
        }

        uint balance = wbtc.balanceOf(address(this));
        wbtc.safeTransfer(_controller, balance);
    }

    function getPrice() public view returns (uint) {
        (, int answer, , , ) = feed.latestRoundData();
        require(answer > 0, "CONTROLLER: Price Feed Failed");
        return uint(answer * 10**10);
    }
}
