# Fix: Single-Sided Liquidity Range Validation

## Problem

When attempting to add single-sided Token X liquidity to a DLMM pool, the transaction was failing with:

```
Error Code: InvalidPositionWidth
Error Number: 6040
Error Message: Invalid position width
```

**Root Cause**: The user selected a price range (bins 118-188) that **did not include the active bin (116)**. For single-sided deposits in DLMM, the position must start at or very near the active bin.

### Example from Logs:
- Active bin: 116 (price ~1.336)
- User's selected range: bins 118-188 (prices 1.34-1.6)
- Issue: minBinId (118) > activeBinId (116) - gap of 2 bins

## DLMM Single-Sided Liquidity Rules

### Token X (Base Token) Deposits
- Token X sits in bins **ABOVE** (to the right of) the active price
- **Minimum price MUST be at or below the active price**
- Maximum price can be above the active price
- Position must start at or adjacent to (within 1 bin of) the active bin

### Token Y (Quote Token) Deposits
- Token Y sits in bins **BELOW** (to the left of) the active price
- **Maximum price MUST be at or above the active price**
- Minimum price can be below the active price
- Position must end at or adjacent to (within 1 bin of) the active bin

### Dual-Sided Deposits
- Both tokens provided
- Range should ideally include the active bin for optimal capital efficiency

## Solution Implemented

### 1. Backend Validation (useDLMM.ts:1871-1916)

Added strict validation before transaction submission:

```typescript
// For Token X single-sided deposits
if (isDepositingOnlyTokenX) {
  const MAX_GAP_FROM_ACTIVE = 1;

  if (minBinId > activeBinId + MAX_GAP_FROM_ACTIVE) {
    throw new Error(
      `Invalid range for single-sided Token X deposit: Your range starts at bin ${minBinId}, ` +
      `but the active bin is ${activeBinId}...`
    );
  }
}

// For Token Y single-sided deposits
if (isDepositingOnlyTokenY) {
  const MAX_GAP_FROM_ACTIVE = 1;

  if (maxBinId < activeBinId - MAX_GAP_FROM_ACTIVE) {
    throw new Error(
      `Invalid range for single-sided Token Y deposit: Your range ends at bin ${maxBinId}, ` +
      `but the active bin is ${activeBinId}...`
    );
  }
}
```

### 2. Frontend Validation (AddLiquidityPanel.tsx:255-277)

Added user-friendly error message before transaction:

```typescript
// CRITICAL: For single-sided deposits, validate that range includes or is adjacent to active bin
if (ratio === 'one-side' && showPriceWarning) {
  toast.error(
    <div className="max-w-sm">
      <p className="font-semibold mb-1">⚠️ Invalid range for single-sided deposit</p>
      <p className="text-xs opacity-90">
        Your price range does not include the active price.
      </p>
      <p className="text-xs opacity-75 mt-1">
        For single-sided {tokenXSymbol} deposits, your minimum price must be at or below the active price.
      </p>
    </div>
  );
  return; // Stop transaction
}
```

### 3. Visual Range Validation (AddLiquidityPanel.tsx:447-465)

Added real-time visual warning as user adjusts the range:

```typescript
let rangeValidationMessage = '';
if (isDepositingOnlyTokenX) {
  if (minPrice > safeCurrentPrice * 1.001) {
    rangeValidationMessage = `⚠️ For Token X deposits, your minimum price must be at or below the active price`;
  }
} else if (isDepositingOnlyTokenY) {
  if (maxPrice < safeCurrentPrice * 0.999) {
    rangeValidationMessage = `⚠️ For Token Y deposits, your maximum price must be at or above the active price`;
  }
}
```

This warning displays in the UI as the user adjusts the slider/inputs.

## Testing

To test the fix:

1. **Navigate to the pool page**:
   ```
   http://localhost:3000/pool/HA61vPCog4XP2tK6r6zrdQoUCvAansBQu59q9Q8RW4yH
   ```

2. **Try to reproduce the error**:
   - Select "One Side" ratio (Token X only)
   - Enter an amount (e.g., 10 tokens)
   - Adjust the minimum price slider to be **above** the active price (cyan line)
   - You should now see a yellow warning message
   - Clicking "Add Liquidity" should show an error toast and prevent the transaction

3. **Test valid range**:
   - Reset the range using the "Reset" button or select a strategy preset
   - Ensure the minimum price is at or below the active price (cyan line)
   - The warning should disappear
   - Transaction should succeed

4. **Test with Playwright** (if available):
   - The Playwright browser instance should show the visual warnings
   - The console logs should show clear error messages

## Expected Behavior

### Before Fix
❌ Transaction fails with cryptic "Invalid position width" error from blockchain
❌ No clear guidance to the user about what went wrong
❌ User wastes SOL on failed transactions

### After Fix
✅ Visual warning appears immediately when range is invalid
✅ Clear error message explains what needs to be changed
✅ Transaction is prevented before submission
✅ No wasted SOL on doomed transactions

## Related Files

- `/src/lib/meteora/useDLMM.ts` - Backend validation logic
- `/src/components/liquidity/AddLiquidityPanel.tsx` - Frontend validation and UI
- `/src/components/liquidity/InteractiveRangeSlider.tsx` - Visual range selector

## References

- [Meteora DLMM SDK Documentation](https://docs.meteora.ag/developer-guide/guides/dlmm/typescript-sdk/sdk-functions)
- DLMM Program Error 6040: Invalid Position Width
