import ky, { Options } from 'ky';
import {
  GetChartRequest,
  GetChartResponse,
  GetGemsTokenListIndividualResponse,
  GetGemsTokenListRequest,
  GetTokenDescriptionResponse,
  GetTokenRequest,
  GetTokenResponse,
  GetTopHoldersResponse,
  GetTxsRequest,
  GetTxsResponse,
} from './types';
import { serializeParams } from './utils';

const BASE_URL = 'https://datapi.jup.ag';

/**
 * Jupiter Data API Client
 * Provides access to pool data, token information, charts, and transactions
 * from Jupiter's public data aggregation API
 */
export class JupiterDataClient {
  /**
   * Get list of tokens/pools with filters
   * Used for exploring recent launches, graduating tokens, and graduated pools
   */
  static async getGemsTokenList<T extends GetGemsTokenListRequest>(
    req: T,
    options?: Options
  ): Promise<{
    [K in keyof T]: undefined extends T[K]
      ? GetGemsTokenListIndividualResponse | undefined
      : GetGemsTokenListIndividualResponse;
  }> {
    return ky
      .post(`${BASE_URL}/v1/pools/gems`, {
        json: req,
        ...options,
      })
      .json();
  }

  /**
   * Get detailed token/pool information
   */
  static async getToken(req: GetTokenRequest, options?: Options): Promise<GetTokenResponse> {
    return ky
      .get(`${BASE_URL}/v1/pools`, {
        searchParams: serializeParams({
          assetIds: [req.id],
        }),
        ...options,
      })
      .json();
  }

  /**
   * Get holder distribution for a token
   */
  static async getTokenHolders(assetId: string, options?: Options): Promise<GetTopHoldersResponse> {
    return ky.get(`${BASE_URL}/v1/holders/${assetId}`, options).json();
  }

  /**
   * Get chart data (OHLC candlesticks) for a token
   * Supports multiple timeframes and intervals
   */
  static async getChart(
    assetId: string,
    params: GetChartRequest,
    options?: Options
  ): Promise<GetChartResponse> {
    return ky
      .get(`${BASE_URL}/v2/charts/${assetId}`, {
        searchParams: serializeParams(params),
        ...options,
      })
      .json();
  }

  /**
   * Get transaction history for a token
   * Includes buy/sell trades with trader addresses
   */
  static async getTokenTxs(
    assetId: string,
    req: GetTxsRequest,
    options?: Options
  ): Promise<GetTxsResponse> {
    return ky
      .get(`${BASE_URL}/v1/txs/${assetId}`, {
        searchParams: serializeParams(req),
        ...options,
      })
      .json();
  }

  /**
   * Get token description/metadata
   */
  static async getTokenDescription(
    assetId: string,
    options?: Options
  ): Promise<GetTokenDescriptionResponse> {
    return ky.get(`${BASE_URL}/v1/assets/${assetId}/description`, options).json();
  }
}

// Export as ApeClient for compatibility with scaffold code
export { JupiterDataClient as ApeClient };
