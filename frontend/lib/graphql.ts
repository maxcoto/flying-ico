import { GraphQLClient } from 'graphql-request';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || '';
const API_KEY = process.env.NEXT_PUBLIC_GRAPHQL_API_KEY || '';

export const graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT, {
  headers: API_KEY ? {
    'Authorization': `Bearer ${API_KEY}`,
  } : {},
});

export const GET_STAK_VAULTS = `
  query GetFlyingICOs {
    flyingVaults(first: 100, orderBy: createdAt, orderDirection: desc) {
      id
      asset
      name
      symbol
      decimals
      totalAssets
      totalSupply
      investedAssets
      totalPerformanceFees
      redeemsAtNavEnabled
      positionCount
    }
  }
`;

export const GET_STAK_VAULT = `
  query GetFlyingICO($id: ID!) {
    flyingICO(id: $id) {
      id
      asset
      name
      symbol
      decimals
      owner
      treasury
      performanceRate
      vestingStart
      vestingEnd
      redeemsAtNavEnabled
      totalPerformanceFees
      totalAssets
      investedAssets
      redeemableAssets
      totalShares
      totalSupply
      divestFee
      positionCount
      createdAt
      updatedAt
      positions(first: 100, orderBy: createdAt, orderDirection: desc) {
        id
        positionId
        user
        assetAmount
        shareAmount
        sharesUnlocked
        assetsDivested
        vestingAmount
        initialAssets
        isClosed
        createdAt
        updatedAt
      }
    }
  }
`;
