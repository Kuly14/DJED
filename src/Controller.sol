// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "hardhat/console.sol";

interface IMint {
    function mint(address, uint) external;

    function burnFrom(address, uint) external;
}

/// @title Djed Stable Coin
/// @author Kuly14
/// @notice Algorithmic overcollateralized stable coin
/// @custom:experimental This is an experimental contract DO NOT USE IN PRODUCTION

contract Controller is ReentrancyGuard {
    using SafeERC20 for IERC20;

    event DjedBough(address indexed _address, uint indexed _djedAmount);
    event DjedSold(address indexed _address, uint indexed _djedAmount);
    event ShenBought(address indexed _address, uint indexed _shenAmount);
    event ShenSold(address indexed _address, uint indexed _shenAmount);

    AggregatorV3Interface public immutable feed;
    IERC20 public immutable djed;
    IERC20 public immutable shen;
    IERC20 public immutable wbtc;
    uint public PRICE = 1e18;
    uint public FEE = 5e15;
    uint public lastPrice = PRICE;

    uint public rMin = 3e18;
    uint public rMax = 7e18;

    constructor(
        AggregatorV3Interface _priceFeed,
        IERC20 _djedAddress,
        IERC20 _shenAddress,
        IERC20 _wbtcAddress
    ) {
        feed = _priceFeed;
        djed = _djedAddress;
        shen = _shenAddress;
        wbtc = _wbtcAddress;
    }

    function buyDjed(uint _djedAmount) external nonReentrant {
        require(getRatio() >= rMin, "CONTORLLER: Low Reserves");
        require(_djedAmount >= 1e18, "CONTROLLER: Not Enough DJED");
        uint price = getPrice();
        uint priceWithFee = djedPrice() + FEE;
        uint amountToSend = (priceWithFee * _djedAmount) / 1e18;
        uint amountInWbtc = (amountToSend * 1e18) / price;
        require(
            wbtc.balanceOf(msg.sender) >= amountInWbtc,
            "CONTROLLER: Not Enough WBTC"
        );
        wbtc.safeTransferFrom(msg.sender, address(this), amountInWbtc);
        IMint(address(djed)).mint(msg.sender, _djedAmount);
        require(getRatio() >= rMin, "CONTROLLER: Low Reserves");
        emit DjedBough(msg.sender, _djedAmount);
    }

    function sellDjed(uint _amount) external nonReentrant {
        require(
            djed.balanceOf(msg.sender) >= _amount,
            "CONTROLLER: Low Djed Balance"
        );
        uint priceWithFee = djedPrice() - FEE;
        uint dollarAmount = (_amount * priceWithFee) / 1e18;
        uint price = getPrice();
        uint amountWbtc = (dollarAmount * 1e18) / price;
        IMint(address(djed)).burnFrom(msg.sender, _amount);
        wbtc.safeTransfer(msg.sender, amountWbtc);
        emit DjedSold(msg.sender, _amount);
    }

    function buyShen(uint _amountOfShen) external nonReentrant {
        require(getRatio() <= rMax, "CONTROLLER: High Reserves");
        uint shenP = shenPrice();
        uint price = getPrice();
        uint amountInDollars = (_amountOfShen * shenP) / 1e18;
        uint wbtcAmount = (amountInDollars * 1e18) / price;
        wbtc.safeTransferFrom(msg.sender, address(this), wbtcAmount);
        IMint(address(shen)).mint(msg.sender, _amountOfShen);
        require(getRatio() <= rMax, "CONTROLLER: High Reserves");
        emit ShenBought(msg.sender, _amountOfShen);
    }

    function sellShen(uint _amount) external nonReentrant {
        require(
            shen.balanceOf(msg.sender) >= _amount,
            "CONTROLLER: Low Balance"
        );
        require(getRatio() >= rMin, "CONTROLLER: Low Reserves");
        uint price = getPrice();
        uint shenP = shenPrice();
        uint amountInDollars = (_amount * shenP) / 1e18;
        uint amountToSend = (amountInDollars * 1e18) / price;
        IMint(address(shen)).burnFrom(msg.sender, _amount);
        wbtc.safeTransfer(msg.sender, amountToSend);
        require(getRatio() >= rMin, "CONTROLLER: Low Reserves");
        emit ShenSold(msg.sender, _amount);
    }

    /** VIEW FUNCTIONS */

    function getRatio() public view returns (uint ratio) {
        uint reserves = getReserves();
        uint supply = djedSupply();
        uint price = getPrice();
        uint dollarReserves = (reserves * price) / 1e18;
        if (supply > 0) {
            ratio = (dollarReserves * 1e18) / supply;
        } else {
            ratio = 0;
        }
    }

    /** 
    @notice Calculates the price of djed.
    @notice If the reserves are lower than liabilities the price is calculated: reserves / djedTotalSupply.
    @return price returns the price of djed.
    */

    function djedPrice() public view returns (uint price) {
        uint wbtcPrice = getPrice();
        uint reserves = (getReserves() * wbtcPrice) / 1e18;
        uint x = (reserves * 1e18) / djedSupply();
        price = Math.min(PRICE, x);
    }

    /** 
    @notice Calculates the price of shen
    @notice That the price of shen is deducted from the equity in the contract
    @return finalPrice of shen
    */
    function shenPrice() public view returns (uint finalPrice) {
        uint equity = getEquity();
        uint defaultShenPrice = PRICE;
        uint currentShenPrice = (equity * 1e18) / shenSupply(); // There should always be some shenSupply.
        finalPrice = Math.max(defaultShenPrice, currentShenPrice); // Final price is already in $$$ from the getEquity() funcition.
    }

    /** 
    @notice gets price of ETH in USD from chainlink oracle.
    */
    function getPrice() public view returns (uint) {
        (, int answer, , , ) = feed.latestRoundData();
        require(answer > 0, "CONTROLLER: Price Feed Failed");
        return uint(answer * 10**10);
    }

    // @notice shows reserves of the contract
    function getReserves() public view returns (uint) {
        return wbtc.balanceOf(address(this));
    }

    /** 
    @notice shows equity of the contract
    @notice equity is just reserves - liabilities.
    */
    function getEquity() public view returns (uint equity) {
        uint wbtcPrice = getPrice();
        uint reservesInDollars = (getReserves() * wbtcPrice) / 1e18;

        equity = reservesInDollars - djedSupply();
    }

    /** 
    @notice shows total supply of djed
    */
    function djedSupply() public view returns (uint) {
        return djed.totalSupply();
    }

    /**
    @notice shows total supply of shen
    */
    function shenSupply() public view returns (uint) {
        return shen.totalSupply();
    }

    /** 
    @notice Receive function so that eth can be sent to this contract directly from the ICO of shen.
    */
    receive() external payable {}
}
