/**
 * JSONC (JSON with Comments) Parser
 * Strips comments and parses Meteora config files
 */

/**
 * Remove all comments from JSONC string
 */
export function stripJSONComments(jsonc: string): string {
  let result = '';
  let inString = false;
  let inSingleLineComment = false;
  let inMultiLineComment = false;
  let escapeNext = false;

  for (let i = 0; i < jsonc.length; i++) {
    const char = jsonc[i];
    const nextChar = jsonc[i + 1];

    // Handle escape sequences in strings
    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      result += char;
      escapeNext = true;
      continue;
    }

    // Toggle string state
    if (char === '"' && !inSingleLineComment && !inMultiLineComment) {
      inString = !inString;
      result += char;
      continue;
    }

    // Skip if we're in a string
    if (inString) {
      result += char;
      continue;
    }

    // Start of single-line comment
    if (char === '/' && nextChar === '/' && !inMultiLineComment) {
      inSingleLineComment = true;
      i++; // Skip the next '/'
      continue;
    }

    // End of single-line comment
    if (inSingleLineComment && (char === '\n' || char === '\r')) {
      inSingleLineComment = false;
      result += char; // Keep newline
      continue;
    }

    // Start of multi-line comment
    if (char === '/' && nextChar === '*' && !inSingleLineComment) {
      inMultiLineComment = true;
      i++; // Skip the '*'
      continue;
    }

    // End of multi-line comment
    if (inMultiLineComment && char === '*' && nextChar === '/') {
      inMultiLineComment = false;
      i++; // Skip the '/'
      continue;
    }

    // Skip characters inside comments
    if (inSingleLineComment || inMultiLineComment) {
      continue;
    }

    // Add character to result
    result += char;
  }

  return result;
}

/**
 * Parse JSONC string to JavaScript object
 */
export function parseJSONC<T = any>(jsonc: string): T {
  try {
    const json = stripJSONComments(jsonc);
    return JSON.parse(json);
  } catch (error) {
    throw new Error(`Failed to parse JSONC: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse JSONC file content and validate
 */
export async function parseConfigFile<T = any>(file: File): Promise<T> {
  const text = await file.text();
  return parseJSONC<T>(text);
}

/**
 * Validate Solana address format
 */
function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  // Solana addresses are base58 encoded, typically 32-44 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

/**
 * Validate numeric range
 */
function isInRange(value: any, min: number, max: number): boolean {
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
}

/**
 * Validate config structure
 */
export function validateConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required global fields
  if (!config.rpcUrl) {
    errors.push('Missing required field: rpcUrl');
  } else if (typeof config.rpcUrl !== 'string' || !config.rpcUrl.startsWith('http')) {
    errors.push('rpcUrl must be a valid HTTP(S) URL');
  }

  if (config.dryRun === undefined || config.dryRun === null) {
    errors.push('Missing required field: dryRun');
  } else if (typeof config.dryRun !== 'boolean') {
    errors.push('dryRun must be a boolean (true or false)');
  }

  if (config.computeUnitPriceMicroLamports === undefined) {
    errors.push('Missing required field: computeUnitPriceMicroLamports');
  } else if (!isInRange(config.computeUnitPriceMicroLamports, 0, 1000000)) {
    errors.push('computeUnitPriceMicroLamports must be between 0 and 1,000,000');
  }

  // Validate token mints if present
  if (config.baseMint && !isValidSolanaAddress(config.baseMint)) {
    errors.push('baseMint must be a valid Solana address');
  }
  if (config.quoteMint && !isValidSolanaAddress(config.quoteMint)) {
    errors.push('quoteMint must be a valid Solana address');
  }

  // Validate token creation if present
  if (config.createBaseToken) {
    const token = config.createBaseToken;
    if (!token.name || typeof token.name !== 'string') {
      errors.push('createBaseToken.name is required and must be a string');
    }
    if (!token.symbol || typeof token.symbol !== 'string') {
      errors.push('createBaseToken.symbol is required and must be a string');
    }
    if (!token.uri || typeof token.uri !== 'string' || !token.uri.startsWith('http')) {
      errors.push('createBaseToken.uri must be a valid HTTP(S) URL');
    }
    if (!isInRange(token.decimals, 0, 18)) {
      errors.push('createBaseToken.decimals must be between 0 and 18');
    }
    if (!token.supply || isNaN(Number(token.supply))) {
      errors.push('createBaseToken.supply is required and must be a number');
    }
  }

  // Protocol-specific validation
  const protocol = detectProtocolType(config);

  if (protocol === 'dlmm') {
    validateDLMMConfig(config, errors);
  } else if (protocol === 'damm-v1') {
    validateDAMMv1Config(config, errors);
  } else if (protocol === 'damm-v2') {
    validateDAMMv2Config(config, errors);
  } else if (protocol === 'dbc') {
    validateDBCConfig(config, errors);
  } else if (protocol === 'alpha-vault') {
    validateAlphaVaultConfig(config, errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate DLMM-specific config
 */
function validateDLMMConfig(config: any, errors: string[]): void {
  const dlmm = config.dlmmConfig;
  if (!dlmm) {
    errors.push('Missing dlmmConfig section for DLMM protocol');
    return;
  }

  // Validate binStep
  const validBinSteps = [1, 5, 25, 100];
  if (!validBinSteps.includes(Number(dlmm.binStep))) {
    errors.push(`dlmmConfig.binStep must be one of: ${validBinSteps.join(', ')}`);
  }

  // Validate amounts
  if (!dlmm.baseAmount || isNaN(Number(dlmm.baseAmount))) {
    errors.push('dlmmConfig.baseAmount is required and must be a number');
  }
  if (!dlmm.quoteAmount || isNaN(Number(dlmm.quoteAmount))) {
    errors.push('dlmmConfig.quoteAmount is required and must be a number');
  }

  // Validate feeBps if present
  if (dlmm.feeBps !== undefined && !isInRange(dlmm.feeBps, 0, 10000)) {
    errors.push('dlmmConfig.feeBps must be between 0 and 10,000 (0-100%)');
  }

  // Validate activation type
  if (dlmm.activationType !== undefined) {
    const validTypes = [0, 1, 2];
    if (!validTypes.includes(Number(dlmm.activationType))) {
      errors.push('dlmmConfig.activationType must be 0 (Slot), 1 (Timestamp), or 2');
    }
  }

  // LFG seed liquidity validation
  if (config.lfgSeedLiquidity) {
    const lfg = config.lfgSeedLiquidity;
    if (!lfg.minPrice || isNaN(Number(lfg.minPrice))) {
      errors.push('lfgSeedLiquidity.minPrice is required and must be a number');
    }
    if (!lfg.maxPrice || isNaN(Number(lfg.maxPrice))) {
      errors.push('lfgSeedLiquidity.maxPrice is required and must be a number');
    }
    if (Number(lfg.minPrice) >= Number(lfg.maxPrice)) {
      errors.push('lfgSeedLiquidity.minPrice must be less than maxPrice');
    }
    if (lfg.curvature !== undefined && !isInRange(lfg.curvature, 0, 1)) {
      errors.push('lfgSeedLiquidity.curvature must be between 0.0 and 1.0');
    }
  }
}

/**
 * Validate DAMM v1-specific config
 */
function validateDAMMv1Config(config: any, errors: string[]): void {
  const damm = config.dammV1Config;
  if (!damm) {
    errors.push('Missing dammV1Config section for DAMM v1 protocol');
    return;
  }

  if (!damm.baseAmount || isNaN(Number(damm.baseAmount))) {
    errors.push('dammV1Config.baseAmount is required and must be a number');
  }
  if (!damm.quoteAmount || isNaN(Number(damm.quoteAmount))) {
    errors.push('dammV1Config.quoteAmount is required and must be a number');
  }
  if (damm.fee !== undefined && !isInRange(damm.fee, 0, 10000)) {
    errors.push('dammV1Config.fee must be between 0 and 10,000 bps (0-100%)');
  }
}

/**
 * Validate DAMM v2-specific config
 */
function validateDAMMv2Config(config: any, errors: string[]): void {
  const damm = config.dammV2Config;
  if (!damm) {
    // Check for add liquidity operation
    if (config.addLiquidity) {
      const add = config.addLiquidity;
      if (!add.poolAddress || !isValidSolanaAddress(add.poolAddress)) {
        errors.push('addLiquidity.poolAddress is required and must be a valid Solana address');
      }
      if (!add.baseAmount || isNaN(Number(add.baseAmount))) {
        errors.push('addLiquidity.baseAmount is required and must be a number');
      }
      if (add.slippageBps !== undefined && !isInRange(add.slippageBps, 0, 10000)) {
        errors.push('addLiquidity.slippageBps must be between 0 and 10,000 bps');
      }
      return;
    }
    errors.push('Missing dammV2Config or addLiquidity section for DAMM v2 protocol');
    return;
  }

  if (!damm.baseAmount || isNaN(Number(damm.baseAmount))) {
    errors.push('dammV2Config.baseAmount is required and must be a number');
  }
  if (!damm.quoteAmount || isNaN(Number(damm.quoteAmount))) {
    errors.push('dammV2Config.quoteAmount is required and must be a number');
  }
  if (!damm.initPrice || isNaN(Number(damm.initPrice))) {
    errors.push('dammV2Config.initPrice is required and must be a number');
  }
  if (!damm.maxPrice || isNaN(Number(damm.maxPrice))) {
    errors.push('dammV2Config.maxPrice is required and must be a number');
  }
  if (Number(damm.initPrice) >= Number(damm.maxPrice)) {
    errors.push('dammV2Config.initPrice must be less than maxPrice');
  }
  if (damm.poolFees?.tradeFeeInBps !== undefined && !isInRange(damm.poolFees.tradeFeeInBps, 0, 10000)) {
    errors.push('dammV2Config.poolFees.tradeFeeInBps must be between 0 and 10,000 bps');
  }
}

/**
 * Validate DBC-specific config
 */
function validateDBCConfig(config: any, errors: string[]): void {
  // DBC config creation
  if (config.dbcConfig) {
    const dbc = config.dbcConfig;
    if (!dbc.migrationQuoteThreshold || isNaN(Number(dbc.migrationQuoteThreshold))) {
      errors.push('dbcConfig.migrationQuoteThreshold is required and must be a number');
    }
    if (dbc.tradingFee !== undefined && !isInRange(dbc.tradingFee, 0, 10000)) {
      errors.push('dbcConfig.tradingFee must be between 0 and 10,000 bps');
    }
    if (dbc.protocolFee !== undefined && !isInRange(dbc.protocolFee, 0, 10000)) {
      errors.push('dbcConfig.protocolFee must be between 0 and 10,000 bps');
    }
  }

  // DBC pool creation
  if (config.dbcPool) {
    const pool = config.dbcPool;
    if (!pool.configAddress || !isValidSolanaAddress(pool.configAddress)) {
      errors.push('dbcPool.configAddress is required and must be a valid Solana address');
    }
    if (!pool.initialPrice || isNaN(Number(pool.initialPrice))) {
      errors.push('dbcPool.initialPrice is required and must be a number');
    }
  }

  // DBC swap
  if (config.dbcSwap) {
    const swap = config.dbcSwap;
    if (!swap.poolAddress || !isValidSolanaAddress(swap.poolAddress)) {
      errors.push('dbcSwap.poolAddress is required and must be a valid Solana address');
    }
    if (!swap.amount || isNaN(Number(swap.amount))) {
      errors.push('dbcSwap.amount is required and must be a number');
    }
    if (!swap.side || !['buy', 'sell'].includes(swap.side)) {
      errors.push('dbcSwap.side must be "buy" or "sell"');
    }
    if (swap.slippageBps !== undefined && !isInRange(swap.slippageBps, 0, 10000)) {
      errors.push('dbcSwap.slippageBps must be between 0 and 10,000 bps');
    }
  }
}

/**
 * Validate Alpha Vault-specific config
 */
function validateAlphaVaultConfig(config: any, errors: string[]): void {
  const vault = config.alphaVault;
  if (!vault) {
    errors.push('Missing alphaVault section for Alpha Vault protocol');
    return;
  }

  if (!vault.poolAddress || !isValidSolanaAddress(vault.poolAddress)) {
    errors.push('alphaVault.poolAddress is required and must be a valid Solana address');
  }
  if (!vault.poolType || !['dlmm', 'damm-v1', 'damm-v2'].includes(vault.poolType)) {
    errors.push('alphaVault.poolType must be "dlmm", "damm-v1", or "damm-v2"');
  }
  if (!vault.baseMint || !isValidSolanaAddress(vault.baseMint)) {
    errors.push('alphaVault.baseMint is required and must be a valid Solana address');
  }
  if (!vault.quoteMint || !isValidSolanaAddress(vault.quoteMint)) {
    errors.push('alphaVault.quoteMint is required and must be a valid Solana address');
  }
  if (vault.maxDepositCap === undefined || isNaN(Number(vault.maxDepositCap))) {
    errors.push('alphaVault.maxDepositCap is required and must be a number (0 for unlimited)');
  }
  if (vault.escrowFee !== undefined && !isInRange(vault.escrowFee, 0, 10000)) {
    errors.push('alphaVault.escrowFee must be between 0 and 10,000 bps');
  }
  if (vault.performanceFeeBps !== undefined && !isInRange(vault.performanceFeeBps, 0, 10000)) {
    errors.push('alphaVault.performanceFeeBps must be between 0 and 10,000 bps');
  }
  if (vault.managementFeeBps !== undefined && !isInRange(vault.managementFeeBps, 0, 10000)) {
    errors.push('alphaVault.managementFeeBps must be between 0 and 10,000 bps (per year)');
  }
}

/**
 * Get protocol type from config
 */
export function detectProtocolType(config: any): string | null {
  if (config.dlmmConfig) return 'dlmm';
  if (config.dammV2Config) return 'damm-v2';
  if (config.dammV1Config) return 'damm-v1';
  if (config.dbcConfig || config.dbcPool) return 'dbc';
  if (config.alphaVault) return 'alpha-vault';
  return null;
}
