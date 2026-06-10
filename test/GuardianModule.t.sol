// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../contracts/GuardianModule.sol";

interface Vm {
    function warp(uint256) external;
    function expectRevert(bytes4) external; function expectRevert(bytes calldata) external;
}

contract GuardianModuleTest {
    Vm constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);
    GuardianModule g;
    uint256 constant MAXT = 100e18;
    uint256 constant CAP = 250e18;
    uint256 constant MINPEG = 970000000000000000;
    uint256 constant DELAY = 2 days;

    function setUp() public {
        g = new GuardianModule(MAXT, CAP, MINPEG, DELAY);
    }

    function test_initialState() public view {
        require(g.owner() == address(this), "owner");
        require(g.guardians(address(this)), "guardian");
        require(!g.paused(), "paused");
        require(g.canExecute(1e18, 1e18), "canExec");
    }

    function test_pauseBlocks() public {
        g.pause();
        require(g.paused(), "not paused");
        require(!g.canExecute(1e18, 1e18), "view exec");
        require(!g.guardExecution(1e18, 1e18), "guard exec");
    }

    function test_depegBlocks() public {
        uint256 bad = MINPEG - 1;
        require(!g.canExecute(1e18, bad), "view depeg");
        require(!g.guardExecution(1e18, bad), "guard depeg");
    }

    function test_tradeTooLarge() public {
        require(!g.canExecute(MAXT + 1, 1e18), "view large");
        require(!g.guardExecution(MAXT + 1, 1e18), "guard large");
    }

    function test_dailyCapTrips() public {
        require(g.guardExecution(MAXT, 1e18), "first");
        require(g.guardExecution(MAXT, 1e18), "second");
        require(!g.guardExecution(MAXT, 1e18), "third blocked");
        require(g.paused(), "breaker latched");
    }

    function test_timelock() public {
        vm.expectRevert(abi.encodeWithSelector(GuardianModule.TimelockPending.selector, uint256(0)));
        g.setMaxTrade(200e18);
        bytes32 id = keccak256(abi.encodePacked("maxTrade", uint256(200e18)));
        g.queue(id);
        vm.warp(block.timestamp + DELAY + 1);
        g.setMaxTrade(200e18);
        require(g.maxTradeWei() == 200e18, "maxTrade updated");
    }

    function testFuzz_pausedAlwaysBlocks(uint256 amountWei, uint256 pegE18) public {
        g.pause();
        require(!g.canExecute(amountWei, pegE18), "paused view");
        require(!g.guardExecution(amountWei, pegE18), "paused guard");
    }

    function testFuzz_withinLimits(uint96 amountWei, uint256 pegE18) public view {
        uint256 amt = uint256(amountWei) % MAXT + 1;
        uint256 peg = pegE18 < MINPEG ? MINPEG : pegE18;
        require(g.canExecute(amt, peg), "within limits");
    }
}
