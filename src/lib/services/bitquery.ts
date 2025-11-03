/**
 * Bitquery GraphQL API client for Meteora pools
 * Provides real-time OHLCV data for DLMM, DAMM v2, and DBC pools
 *
 * Docs: https://docs.bitquery.io/docs/blockchain/Solana/Meteora-DLMM-API/
 */

import { ApolloClient, InMemoryCache, HttpLink, split, gql } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

// Bitquery API endpoints
const HTTP_ENDPOINT = 'https://streaming.bitquery.io/graphql';
const WS_ENDPOINT = 'wss://streaming.bitquery.io/graphql';

// Get API token from environment (free tier available at bitquery.io)
const API_TOKEN = process.env.NEXT_PUBLIC_BITQUERY_API_TOKEN || '';

// HTTP link for queries
const httpLink = new HttpLink({
  uri: HTTP_ENDPOINT,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
  },
});

// WebSocket link for subscriptions (real-time data)
const wsLink = typeof window !== 'undefined' ? new GraphQLWsLink(
  createClient({
    url: WS_ENDPOINT,
    connectionParams: {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    },
  })
) : null;

// Split between HTTP and WebSocket based on operation type
const splitLink = typeof window !== 'undefined' && wsLink
  ? split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      wsLink,
      httpLink
    )
  : httpLink;

// Apollo Client instance
export const bitqueryClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

/**
 * GraphQL Queries
 */

// Get OHLC data for DLMM pools
export const GET_DLMM_OHLC = gql`
  query GetDLMMOHLC(
    $pool: String!
    $from: DateTime!
    $till: DateTime
    $interval: Int!
  ) {
    Solana {
      DEXTradeByTokens(
        where: {
          Trade: {
            Dex: {
              ProtocolName: { is: "meteora_dlmm" }
            }
            Market: {
              MarketAddress: { is: $pool }
            }
          }
          Block: {
            Time: { since: $from, till: $till }
          }
        }
        orderBy: { descendingByField: "Block_Time" }
      ) {
        Block {
          Time(interval: { in: seconds, count: $interval })
        }
        volume: sum(of: Trade_Amount)
        Trade {
          high: Price(maximum: Trade_Price)
          low: Price(minimum: Trade_Price)
          open: Price(minimum: Block_Slot)
          close: Price(maximum: Block_Slot)
        }
        count
      }
    }
  }
`;

// Get latest trades for a pool
export const GET_LATEST_TRADES = gql`
  query GetLatestTrades($pool: String!, $limit: Int!) {
    Solana {
      DEXTrades(
        where: {
          Trade: {
            Dex: {
              ProtocolName: { in: ["meteora_dlmm", "meteora_dyn", "meteora_damm_v2"] }
            }
            Market: {
              MarketAddress: { is: $pool }
            }
          }
        }
        orderBy: { descendingByField: "Block_Time" }
        limit: { count: $limit }
      ) {
        Block {
          Time
        }
        Trade {
          Amount
          Price
          Side
          Account {
            Address
          }
        }
        Transaction {
          Signature
        }
      }
    }
  }
`;

// Get pool statistics (24h volume, TVL, etc.)
export const GET_POOL_STATS = gql`
  query GetPoolStats($pool: String!) {
    Solana {
      DEXTradeByTokens(
        where: {
          Trade: {
            Market: {
              MarketAddress: { is: $pool }
            }
          }
          Block: {
            Time: { since: "24 hours ago" }
          }
        }
      ) {
        Trade {
          Currency {
            Symbol
            Name
            MintAddress
          }
          Side {
            Currency {
              Symbol
              Name
              MintAddress
            }
          }
          PriceInUSD
        }
        volume24h: sum(of: Trade_AmountInUSD)
        trades: count
      }
    }
  }
`;

// Get trending pools (top volume)
export const GET_TRENDING_POOLS = gql`
  query GetTrendingPools($limit: Int!, $protocol: String) {
    Solana {
      DEXTradeByTokens(
        where: {
          Trade: {
            Dex: {
              ProtocolName: { is: $protocol }
            }
          }
          Block: {
            Time: { since: "24 hours ago" }
          }
        }
        orderBy: { descendingByField: "volume24h" }
        limit: { count: $limit }
      ) {
        Trade {
          Market {
            MarketAddress
          }
          Currency {
            Symbol
            Name
            MintAddress
          }
          Side {
            Currency {
              Symbol
              Name
              MintAddress
            }
          }
        }
        volume24h: sum(of: Trade_AmountInUSD)
        priceUsd: Trade_PriceInUSD(maximum: Block_Time)
        priceChange24h: Trade_PriceInUSD(
          maximum: Block_Time
          minimum: Block_Time
          aggregation: PERCENTAGE_CHANGE
        )
      }
    }
  }
`;

// Real-time trade subscription
export const SUBSCRIBE_TO_TRADES = gql`
  subscription SubscribeToTrades($pool: String!) {
    Solana {
      DEXTrades(
        where: {
          Trade: {
            Market: {
              MarketAddress: { is: $pool }
            }
          }
        }
      ) {
        Block {
          Time
        }
        Trade {
          Amount
          Price
          Side
          AmountInUSD
        }
        Transaction {
          Signature
        }
      }
    }
  }
`;

/**
 * Type definitions for API responses
 */

export interface OHLCDataPoint {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Trade {
  timestamp: number;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
  signature: string;
  trader: string;
}

export interface PoolStats {
  address: string;
  baseToken: {
    symbol: string;
    name: string;
    address: string;
  };
  quoteToken: {
    symbol: string;
    name: string;
    address: string;
  };
  price: number;
  priceChange24h: number;
  volume24h: number;
  trades24h: number;
  tvl?: number;
}

export interface TrendingPool extends PoolStats {
  rank: number;
}

/**
 * Helper functions to transform Bitquery responses
 */

export function transformOHLCData(data: any): OHLCDataPoint[] {
  if (!data?.Solana?.DEXTradeByTokens) return [];

  return data.Solana.DEXTradeByTokens.map((item: any) => ({
    time: Math.floor(new Date(item.Block.Time).getTime() / 1000),
    open: parseFloat(item.Trade.open || 0),
    high: parseFloat(item.Trade.high || 0),
    low: parseFloat(item.Trade.low || 0),
    close: parseFloat(item.Trade.close || 0),
    volume: parseFloat(item.volume || 0),
  })).reverse(); // Oldest first for chart
}

export function transformTrades(data: any): Trade[] {
  if (!data?.Solana?.DEXTrades) return [];

  return data.Solana.DEXTrades.map((item: any) => ({
    timestamp: new Date(item.Block.Time).getTime(),
    price: parseFloat(item.Trade.Price || 0),
    amount: parseFloat(item.Trade.Amount || 0),
    side: item.Trade.Side === 'buy' ? 'buy' : 'sell',
    signature: item.Transaction.Signature,
    trader: item.Trade.Account?.Address || '',
  }));
}

export function transformPoolStats(data: any, poolAddress: string): PoolStats | null {
  if (!data?.Solana?.DEXTradeByTokens?.[0]) return null;

  const pool = data.Solana.DEXTradeByTokens[0];

  return {
    address: poolAddress,
    baseToken: {
      symbol: pool.Trade.Currency.Symbol || 'Unknown',
      name: pool.Trade.Currency.Name || 'Unknown Token',
      address: pool.Trade.Currency.MintAddress,
    },
    quoteToken: {
      symbol: pool.Trade.Side.Currency.Symbol || 'Unknown',
      name: pool.Trade.Side.Currency.Name || 'Unknown Token',
      address: pool.Trade.Side.Currency.MintAddress,
    },
    price: parseFloat(pool.Trade.PriceInUSD || 0),
    priceChange24h: 0, // TODO: Calculate from OHLC data
    volume24h: parseFloat(pool.volume24h || 0),
    trades24h: parseInt(pool.trades || 0),
  };
}

export function transformTrendingPools(data: any): TrendingPool[] {
  if (!data?.Solana?.DEXTradeByTokens) return [];

  return data.Solana.DEXTradeByTokens.map((item: any, index: number) => ({
    rank: index + 1,
    address: item.Trade.Market.MarketAddress,
    baseToken: {
      symbol: item.Trade.Currency.Symbol || 'Unknown',
      name: item.Trade.Currency.Name || 'Unknown Token',
      address: item.Trade.Currency.MintAddress,
    },
    quoteToken: {
      symbol: item.Trade.Side.Currency.Symbol || 'Unknown',
      name: item.Trade.Side.Currency.Name || 'Unknown Token',
      address: item.Trade.Side.Currency.MintAddress,
    },
    price: parseFloat(item.priceUsd || 0),
    priceChange24h: parseFloat(item.priceChange24h || 0),
    volume24h: parseFloat(item.volume24h || 0),
    trades24h: 0,
  }));
}
