'use client';

import { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { readContract, writeContract, waitForTransactionReceipt } from '@wagmi/core';
import { config } from '@/lib/wagmi';
import { formatUnits, type Address } from 'viem';
import FaucetABI from '@/app/abis/Faucet.json';
import { getTokenPicture } from '@/app/utils/logos';
import { chainByID } from '@/app/utils/chains';
import Image from 'next/image';
import toast from 'react-hot-toast';

const FAUCET_ADDRESS = '0x814456630e27aCcFbd165468bF4F09f8a90f2D2f' as Address;

interface TokenInfo {
  name: string;
  symbol: string;
  address: Address;
  amount: bigint;
  decimals: number;
  functionName: string;
}

// Default token addresses and amounts (from user provided values)
const DEFAULT_TOKENS: TokenInfo[] = [
  {
    name: 'DAI',
    symbol: 'DAI',
    address: '0xC746631571dac7a2f6c2cf1d54C8691D97405b41' as Address,
    amount: BigInt('10000000000000000000000'), // 10000 * 10**18
    decimals: 18,
    functionName: 'getDai',
  },
  {
    name: 'USDC',
    symbol: 'USDC',
    address: '0xD6eDDb13aD13767a2b4aD89eA94fcA0C6aB0f8D2' as Address,
    amount: BigInt('10000000000'), // 10000 * 10**6
    decimals: 6,
    functionName: 'getUsdc',
  },
  {
    name: 'USDT',
    symbol: 'USDT',
    address: '0x2B36461AC773c6Ca3728Fd29AA51C5D8D4995561' as Address,
    amount: BigInt('10000000000'), // 10000 * 10**6
    decimals: 6,
    functionName: 'getUsdt',
  },
  {
    name: 'WBTC',
    symbol: 'WBTC',
    address: '0x2C16b6d715af41C7AB01E7BFEBA497768982b906' as Address,
    amount: BigInt('100000000'), // 1 * 10**8
    decimals: 8,
    functionName: 'getWbtc',
  },
  {
    name: 'WETH',
    symbol: 'WETH',
    address: '0x90e9942FE624bc1C36463F895DD367d04d571b2A' as Address,
    amount: BigInt('10000000000000000000'), // 10 * 10**18
    decimals: 18,
    functionName: 'getWeth',
  },
];

export default function FaucetPage() {
  const { address: userAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const chain = chainByID(chainId);
  const [tokens, setTokens] = useState<TokenInfo[]>(DEFAULT_TOKENS);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  // Token configurations for reading from contract
  const tokenConfigs = [
    { name: 'DAI', symbol: 'DAI', functionName: 'getDai', decimals: 18 },
    { name: 'USDC', symbol: 'USDC', functionName: 'getUsdc', decimals: 6 },
    { name: 'USDT', symbol: 'USDT', functionName: 'getUsdt', decimals: 6 },
    { name: 'WBTC', symbol: 'WBTC', functionName: 'getWbtc', decimals: 8 },
    { name: 'WETH', symbol: 'WETH', functionName: 'getWeth', decimals: 18 },
  ];

  useEffect(() => {
    async function loadTokenData() {
      // Start with default tokens
      setTokens(DEFAULT_TOKENS);
      setLoading(false);

      // Try to update from contract if connected
      if (!isConnected) {
        return;
      }

      try {
        const tokenData: TokenInfo[] = [];

        for (const tokenConfig of tokenConfigs) {
          try {
            // Get token address
            const tokenAddress = await readContract(config, {
              address: FAUCET_ADDRESS,
              abi: FaucetABI,
              functionName: `T_${tokenConfig.symbol}` as any,
            }) as Address;

            // Get amount
            const amount = await readContract(config, {
              address: FAUCET_ADDRESS,
              abi: FaucetABI,
              functionName: `AMOUNT_${tokenConfig.symbol}` as any,
            }) as bigint;

            tokenData.push({
              name: tokenConfig.name,
              symbol: tokenConfig.symbol,
              address: tokenAddress,
              amount,
              decimals: tokenConfig.decimals,
              functionName: tokenConfig.functionName,
            });
          } catch (error) {
            console.error(`Error loading ${tokenConfig.symbol} from contract:`, error);
            // Use default value for this token
            const defaultToken = DEFAULT_TOKENS.find(t => t.symbol === tokenConfig.symbol);
            if (defaultToken) {
              tokenData.push(defaultToken);
            }
          }
        }

        // Only update if we got at least some data
        if (tokenData.length > 0) {
          setTokens(tokenData);
        }
      } catch (error) {
        console.error('Error loading token data from contract:', error);
        // Keep default tokens, don't show error toast as defaults are fine
      }
    }

    loadTokenData();
  }, [isConnected]);

  const handleClaim = async (token: TokenInfo) => {
    if (!isConnected || !userAddress) {
      toast.error('Please connect your wallet');
      return;
    }

    setClaiming(token.symbol);
    toast.loading(`Claiming ${token.symbol}...`, { id: `claim-${token.symbol}` });

    try {
      const hash = await writeContract(config, {
        address: FAUCET_ADDRESS,
        abi: FaucetABI,
        functionName: token.functionName as any,
        args: [],
      });

      toast.loading('Transaction submitted. Waiting for confirmation...', { id: `claim-${token.symbol}` });

      const receipt = await waitForTransactionReceipt(config, { hash });

      if (receipt.status === 'success') {
        toast.success(`Successfully claimed ${token.symbol}!`, { id: `claim-${token.symbol}` });
      } else {
        toast.error(`Transaction failed for ${token.symbol}`, { id: `claim-${token.symbol}` });
      }
    } catch (error: any) {
      console.error(`Error claiming ${token.symbol}:`, error);
      console.error('Full error details:', {
        message: error?.message,
        cause: error?.cause,
        shortMessage: error?.shortMessage,
        details: error?.details,
        data: error?.data,
        name: error?.name,
      });
      
      let errorMessage = `Failed to claim ${token.symbol}. Please try again.`;
      
      if (error?.message?.includes('User rejected') || error?.message?.includes('user rejected') || error?.code === 4001) {
        errorMessage = 'Transaction cancelled';
      } else if (error?.shortMessage) {
        errorMessage = error.shortMessage;
      } else if (error?.message) {
        // Try to extract a more helpful error message
        const msg = error.message.toLowerCase();
        if (msg.includes('insufficient funds') || msg.includes('insufficient balance')) {
          errorMessage = 'Insufficient funds for transaction';
        } else if (msg.includes('execution reverted')) {
          // Try to extract revert reason
          const revertMatch = error.message.match(/revert\s+(.+)/i) || error.message.match(/reason:\s*(.+)/i);
          if (revertMatch) {
            errorMessage = `Transaction reverted: ${revertMatch[1]}`;
          } else {
            errorMessage = `Transaction reverted. Check console for details.`;
          }
        } else if (msg.length < 150) {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage, { id: `claim-${token.symbol}` });
    } finally {
      setClaiming(null);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatAmount = (amount: bigint, decimals: number) => {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: decimals === 18 ? 2 : decimals === 6 ? 2 : 8,
    }).format(Number(formatUnits(amount, decimals)));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-primary dark:to-black">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Faucet
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Get test tokens for development and testing
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
            <p className="mt-4 text-gray-600 dark:text-white">Loading faucet data...</p>
          </div>
        ) : tokens.length === 0 ? (
          <div className="bg-white dark:bg-secondary-dark/5 rounded-2xl shadow-lg p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No tokens available
            </p>
          </div>
        ) : (
          <>
            {!isConnected && (
              <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                  ⚠️ Please connect your wallet to claim tokens
                </p>
              </div>
            )}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tokens.map((token) => (
              <div
                key={token.symbol}
                className="bg-white dark:bg-dark-primary/70 rounded-xl p-6 shadow-lg border-2 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-primary/70 transition-all"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Image
                      src={getTokenPicture('sepolia', token.address)}
                      alt={token.symbol}
                      width={64}
                      height={64}
                      className="rounded-full"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {token.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {token.symbol}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Token Address
                    </p>
                    <p className="text-sm font-mono text-gray-900 dark:text-white break-all">
                      {formatAddress(token.address)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Amount per Claim
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatAmount(token.amount, token.decimals)} {token.symbol}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleClaim(token)}
                  disabled={claiming === token.symbol}
                  className="w-full px-4 py-3 bg-primary/50 hover:bg-primary/70 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {claiming === token.symbol ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Claiming...
                    </span>
                  ) : (
                    `Claim ${token.symbol}`
                  )}
                </button>
              </div>
              ))}
            </div>
          </>
        )}

        {tokens.length > 0 && (
          <div className="mt-8 bg-white dark:bg-dark-primary/50 rounded-xl p-6 shadow-lg border-2 border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Faucet Contract
            </h2>
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Address:</p>
              <p className="text-sm font-mono text-gray-900 dark:text-white">
                {formatAddress(FAUCET_ADDRESS)}
              </p>
              <a
                href={`${chain.blockExplorerUrl}/address/${FAUCET_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary/70 hover:underline"
              >
                View on Explorer
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

