def simulate_swap_slippage(amount_in_wei: int, slippage_tolerance_pct: float = 0.5) -> dict:
    """
    Симулирует проход ликвидности через пул x * y = k.
    Рассчитывает ожидаемый объем и выставляет жесткий лимит amountOutMin для защиты от MEV-ботов.
    """
    # Имитируем виртуальную ликвидность пула Moe mETH/WMNT (например, 10,000 ETH)
    pool_reserve_x = 10000 * 10**18  
    pool_reserve_y = 10000 * 10**18
    
    # Расчет Uniswap v2: amountOut = (amountIn * reserveY) / (reserveX + amountIn)
    # Учитываем комиссию пула 0.3%
    amount_in_with_fee = amount_in_wei * 997
    numerator = amount_in_with_fee * pool_reserve_y
    denominator = (pool_reserve_x * 1000) + amount_in_with_fee
    expected_out = numerator // denominator
    
    # Высчитываем минимально приемлемый выход с учетом slippage tolerance (например, 0.5%)
    slippage_factor = (100 - slippage_tolerance_pct) / 100
    amount_out_min = int(expected_out * slippage_factor)
    
    # Считаем реальный процент проскальзывания для логов
    ideal_price = pool_reserve_y / pool_reserve_x
    executed_price = expected_out / amount_in_wei if amount_in_wei > 0 else ideal_price
    real_slippage = ((ideal_price - executed_price) / ideal_price) * 100
    
    return {
        "expected_out": expected_out,
        "amount_out_min": amount_out_min,
        "effective_slippage_pct": round(real_slippage, 4)
    }
