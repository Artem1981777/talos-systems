// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// TALOS GuardianModule (P0 on-chain circuit breaker)
// pause, per-trade cap, daily-volume breaker, timelocked params, mETH/ETH depeg guard. No key custody.
contract GuardianModule {
    address public owner;
    mapping(address => bool) public guardians;
    bool public paused;
    uint256 public maxTradeWei;
    uint256 public dailyCapWei;
    uint256 public spentTodayWei;
    uint256 public currentDay;
    uint256 public minPegE18;
    uint256 public timelockDelay;
    mapping(bytes32 => uint256) public queuedAt;

    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event GuardianSet(address indexed who, bool enabled);
    event ParamQueued(bytes32 indexed id, uint256 eta);
    event MaxTradeUpdated(uint256 value);
    event DailyCapUpdated(uint256 value);
    event MinPegUpdated(uint256 value);
    event BreakerTripped(uint256 spent, uint256 cap);
    event ExecutionChecked(uint256 amountWei, uint256 pegE18, bool ok);
    error NotOwner();
    error NotGuardian();
    error IsPaused();
    error TradeTooLarge(uint256 amountWei, uint256 maxWei);
    error DailyCapExceeded(uint256 spent, uint256 cap);
    error Depegged(uint256 pegE18, uint256 minE18);
    error TimelockPending(uint256 eta);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    modifier onlyGuardian() {
        if (!guardians[msg.sender] && msg.sender != owner) revert NotGuardian();
        _;
    }
    constructor(uint256 _maxTradeWei, uint256 _dailyCapWei, uint256 _minPegE18, uint256 _timelockDelay) {
        owner = msg.sender;
        guardians[msg.sender] = true;
        maxTradeWei = _maxTradeWei;
        dailyCapWei = _dailyCapWei;
        minPegE18 = _minPegE18;
        timelockDelay = _timelockDelay;
        currentDay = block.timestamp / 1 days;
    }

    function setGuardian(address who, bool enabled) external onlyOwner {
        guardians[who] = enabled;
        emit GuardianSet(who, enabled);
    }
    function pause() external onlyGuardian {
        paused = true;
        emit Paused(msg.sender);
    }
    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }
    function queue(bytes32 id) external onlyOwner {
        uint256 eta = block.timestamp + timelockDelay;
        queuedAt[id] = eta;
        emit ParamQueued(id, eta);
    }
    function _consume(bytes32 id) internal {
        uint256 eta = queuedAt[id];
        if (eta == 0 || block.timestamp < eta) revert TimelockPending(eta);
        queuedAt[id] = 0;
    }

    function setMaxTrade(uint256 value) external onlyOwner {
        _consume(keccak256(abi.encodePacked("maxTrade", value)));
        maxTradeWei = value;
        emit MaxTradeUpdated(value);
    }
    function setDailyCap(uint256 value) external onlyOwner {
        _consume(keccak256(abi.encodePacked("dailyCap", value)));
        dailyCapWei = value;
        emit DailyCapUpdated(value);
    }
    function setMinPeg(uint256 value) external onlyOwner {
        _consume(keccak256(abi.encodePacked("minPeg", value)));
        minPegE18 = value;
        emit MinPegUpdated(value);
    }

    function canExecute(uint256 amountWei, uint256 pegE18) public view returns (bool) {
        if (paused) return false;
        if (amountWei > maxTradeWei) return false;
        if (pegE18 < minPegE18) return false;
        uint256 day = block.timestamp / 1 days;
        uint256 spent = day == currentDay ? spentTodayWei : 0;
        if (spent + amountWei > dailyCapWei) return false;
        return true;
    }
    function guardExecution(uint256 amountWei, uint256 pegE18) external onlyGuardian returns (bool) {
        if (paused) return false;
        if (amountWei > maxTradeWei) return false;
        if (pegE18 < minPegE18) return false;
        uint256 day = block.timestamp / 1 days;
        if (day != currentDay) {
            currentDay = day;
            spentTodayWei = 0;
        }
        if (spentTodayWei + amountWei > dailyCapWei) {
            paused = true;
            emit BreakerTripped(spentTodayWei + amountWei, dailyCapWei);
            return false;
        }
        spentTodayWei += amountWei;
        emit ExecutionChecked(amountWei, pegE18, true);
        return true;
    }
}
