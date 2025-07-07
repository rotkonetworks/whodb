import { useCallback } from 'react';

import type { AssetAmount, FormatAmountOptions } from '@/types';
import { formatAmount } from '@/utils';

/**
 * Hook that returns a formatting function preconfigured with chain properties
 * 
 * @param props - Chain properties to use for formatting
 * @returns A memoized formatting function
 */
export function useFormatAmount(props: FormatAmountOptions) {
  const { symbol, tokenDecimals, decimals } = props;


  return useCallback(
    (amount: AssetAmount) => formatAmount(amount, { tokenDecimals, symbol, decimals, }),
    [decimals, symbol, tokenDecimals]
  );
}
