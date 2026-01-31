'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { graphqlClient, GET_STAK_VAULTS } from '@/lib/graphql';
import { formatNumber, formatAddress, EXCLUDED_VAULT_ADDRESSES } from '../utils/helper';
import { getTokenPicture } from '../utils/logos';

interface FlyingICO {
  id: string;
  asset: string;
  name: string;
  symbol: string;
  decimals: string;
  totalAssets: string;
  totalSupply: string;
  investedAssets: string;
  redeemsAtNavEnabled: boolean;
  totalPerformanceFees: string;
  positionCount: string;
}

export default function VaultsPage() {
  const [vaults, setVaults] = useState<FlyingVault[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVaults() {
      try {
        const data = await graphqlClient.request<{ flyingVaults: FlyingVault[] }>(GET_FLYING_VAULTS);
        // Filter out excluded Vault addresses
        const filteredVaults = data.flyingVaults.filter(
          (vault) => !EXCLUDED_VAULT_ADDRESSES.includes(vault.id.toLowerCase())
        );
        setVaults(filteredVaults);
      } catch (error) {
        console.error('Error fetching vaults:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchVaults();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-primary dark:to-black">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Flying Vaults
          </h1>
          <Link
            href="/vaults/new"
            className="px-6 py-3 bg-dark-primary/30 border border-red hover:bg-dark-primary text-primary font-semibold rounded-lg font-medium transition-colors"
          >
            Launch New Vault
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-gray-600 dark:text-white">Loading vaults...</p>
          </div>
        ) : vaults.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-dark-primary rounded-2xl shadow-lg">
            <p className="text-gray-600 font-medium dark:text-gray-200 text-lg">No Vaults found</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {vaults.map((vault) => {
              const total = formatNumber(vault.totalAssets, vault.decimals) + formatNumber(vault.investedAssets, vault.decimals);
              return (
                <Link key={vault.id} href={`/vaults/${vault.id}`}>
                  <div className="bg-white dark:bg-dark-primary rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all border-2 border-gray-200 dark:border-gray-700 hover:border-primary">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{vault.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{vault.symbol}</p>
                      </div>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                        <Image
                          src={getTokenPicture('sepolia', vault.asset)}
                          alt={vault.symbol}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Total Assets:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Total Supply:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(vault.totalSupply, vault.decimals)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Positions:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{vault.positionCount}</span>
                      </div>
                      <div className="flex justify-between gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatAddress(vault.id)}
                        </span>
                        {vault.redeemsAtNavEnabled && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-primary text-green-800 dark:text-black text-xs rounded">
                            NAV Enabled
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  );
}

