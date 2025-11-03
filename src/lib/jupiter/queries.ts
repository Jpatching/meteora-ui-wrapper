import { JupiterDataClient as ApeClient } from './client';
import {
  GetGemsTokenListRequest,
  GetTxsResponse,
  TokenListFilters,
  TokenListTimeframe,
  resolveTokenListFilters,
} from './types';

export type GemsTokenListQueryArgs = {
  [list in keyof GetGemsTokenListRequest]: {
    timeframe: TokenListTimeframe;
    filters?: TokenListFilters;
  };
};

/**
 * React Query query definitions for Jupiter Data API
 * These are used with @tanstack/react-query hooks
 */
export const JupiterQueries = {
  /**
   * Query for getting lists of tokens (recent, graduating, graduated)
   */
  gemsTokenList: (args: GemsTokenListQueryArgs) => {
    const req = {
      recent: args.recent
        ? {
            timeframe: args.recent.timeframe,
            ...resolveTokenListFilters(args.recent.filters),
          }
        : undefined,
      graduated: args.graduated
        ? {
            timeframe: args.graduated.timeframe,
            ...resolveTokenListFilters(args.graduated.filters),
          }
        : undefined,
      aboutToGraduate: args.aboutToGraduate
        ? {
            timeframe: args.aboutToGraduate.timeframe,
            ...resolveTokenListFilters(args.aboutToGraduate.filters),
          }
        : undefined,
    };

    return {
      queryKey: ['jupiter', 'gems', args],
      queryFn: async () => {
        const res = await ApeClient.getGemsTokenList(req);
        return Object.assign(res, { args });
      },
    };
  },

  /**
   * Query for getting specific token information
   */
  tokenInfo: (args: { id: string }) => {
    return {
      queryKey: ['jupiter', 'token', args.id, 'info'],
      queryFn: async () => {
        const info = await ApeClient.getToken({ id: args.id });
        if (!info?.pools[0]) {
          throw new Error('No token info found');
        }
        return info.pools[0];
      },
    };
  },

  /**
   * Query for getting token holder distribution
   */
  tokenHolders: (args: { id: string }) => {
    return {
      queryKey: ['jupiter', 'token', args.id, 'holders'],
      queryFn: async () => {
        const res = await ApeClient.getTokenHolders(args.id);
        return Object.assign(res, { args });
      },
    };
  },

  /**
   * Query for getting token description/metadata
   */
  tokenDescription: (args: { id: string }) => {
    return {
      queryKey: ['jupiter', 'token', args.id, 'description'],
      queryFn: async () => {
        const res = await ApeClient.getTokenDescription(args.id);
        return res;
      },
    };
  },

  /**
   * Infinite query for getting token transactions with pagination
   */
  tokenTxs: (args: { id: string }) => {
    return {
      queryKey: ['jupiter', 'token', args.id, 'txs'],
      queryFn: async ({ signal, pageParam }: any) => {
        const res = await ApeClient.getTokenTxs(
          args.id,
          pageParam ? { ...pageParam } : {},
          { signal }
        );
        return Object.assign(res, { args });
      },
      getNextPageParam: (lastPage: GetTxsResponse) => {
        if (lastPage?.txs.length === 0) {
          return undefined;
        }
        const lastTs = lastPage?.txs[lastPage?.txs.length - 1]?.timestamp;
        return {
          offset: lastPage?.next,
          offsetTs: lastTs,
        };
      },
    };
  },
};

// Export as ApeQueries for compatibility
export { JupiterQueries as ApeQueries };
