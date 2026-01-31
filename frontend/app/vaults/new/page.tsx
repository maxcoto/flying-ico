'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { readContract, writeContract, waitForTransactionReceipt } from '@wagmi/core';
import { config } from '@/lib/wagmi';
import { parseUnits, isAddress, erc20Abi, type Address } from 'viem';
import toast from 'react-hot-toast';
import VaultFactoryABI from '@/app/abis/VaultFactory.json';

export default function NewVaultPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [assetDecimals, setAssetDecimals] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    asset: '',
    name: '',
    symbol: '',
    owner: '',
    treasury: '',
    performanceRate: '',
    vestingStart: '',
    vestingEnd: '',
    startingPrice: '',
    divestFee: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Fetch asset decimals when asset address changes
  useEffect(() => {
    async function fetchDecimals() {
      if (!formData.asset || !isAddress(formData.asset)) {
        setAssetDecimals(null);
        return;
      }

      try {
        const decimals = await readContract(config, {
          address: formData.asset as Address,
          abi: erc20Abi,
          functionName: 'decimals',
          args: [],
        });
        setAssetDecimals(Number(decimals));
      } catch (error) {
        console.error('Error fetching decimals:', error);
        setAssetDecimals(null);
        toast.error('Failed to fetch token decimals. Please check the asset address.');
      }
    }

    fetchDecimals();
  }, [formData.asset]);

  const checkForm = () => {
    const { asset, owner, treasury, performanceRate, vestingStart, vestingEnd, startingPrice, divestFee } = formData;

    if (!isAddress(asset) || !isAddress(owner) || !isAddress(treasury)) {
      toast.error('Please enter valid addresses');
      return false;
    }

    if (assetDecimals === null) {
      toast.error('Please wait for asset decimals to be fetched, or check the asset address');
      return false;
    }

    if (Number(performanceRate) < 0 || Number(performanceRate) > 50) {
      toast.error('Performance rate must be between 0 and 50');
      return false;
    }

    if (Number(divestFee) < 0 || Number(divestFee) > 50) {
      toast.error('Redemption fee must be between 0 and 50');
      return false;
    }

    if (!startingPrice || Number(startingPrice) <= 0) {
      toast.error('Starting price must be greater than 0');
      return false;
    }

    if (new Date(vestingStart) >= new Date(vestingEnd)) {
      toast.error('Vesting start must be before vesting end');
      return false;
    }

    return true;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    setLoading(true);
    try {
      // Note: You'll need to set the factory contract address
      const factoryAddress = process.env.NEXT_PUBLIC_VAULT_FACTORY_ADDRESS as `0x${string}`;

      if (!factoryAddress) {
        toast.error('Factory contract address not configured');
        setLoading(false);
        return;
      }

      if (!checkForm()) {
        setLoading(false);
        return;
      }

      if (assetDecimals === null) {
        toast.error('Asset decimals not available. Please check the asset address.');
        setLoading(false);
        return;
      }

      const hash = await writeContract(config, {
        address: factoryAddress,
        abi: VaultFactoryABI,
        functionName: 'createFlyingICO',
        args: [
          formData.asset as `0x${string}`,
          formData.name,
          formData.symbol,
          formData.owner as `0x${string}`,
          formData.treasury as `0x${string}`,
          parseUnits(formData.performanceRate, 2),
          BigInt(Math.floor(new Date(formData.vestingStart).getTime() / 1000)),
          BigInt(Math.floor(new Date(formData.vestingEnd).getTime() / 1000)),
          parseUnits(formData.startingPrice, assetDecimals),
          parseUnits(formData.divestFee, 2),
        ],
      });

      await waitForTransactionReceipt(config, { hash });
      router.push('/vaults');
    } catch (error) {
      console.error('Error creating vault:', error);
      alert('Failed to create vault. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-primary dark:to-black">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-12 bg-white dark:bg-dark-primary rounded-2xl shadow-lg">
            <p className="text-gray-600 font-medium dark:text-gray-200 my-2">Please connect your wallet to create a new vault</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-primary dark:to-black">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/vaults" className="text-primary hover:text-primary/70 mb-4 inline-block">
          ← Back to Vaults
        </Link>

        <div className="bg-white dark:bg-dark-primary rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Launch New Flying Vault</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Asset Address
              </label>
              <input
                type="text"
                required
                value={formData.asset}
                onChange={(e) => handleInputChange('asset', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0x..."
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">ERC-20 token that will be launched in the ICO (e.g. USDC, WETH).</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="My ICO"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Human-readable name for the ICO. This will also be the ERC-20 name of the ICO token.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Symbol
              </label>
              <input
                type="text"
                required
                value={formData.symbol}
                onChange={(e) => handleInputChange('symbol', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="MVLT"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Short ticker symbol for the ICO token (e.g. vUSDC).</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Owner Address
                </label>
                <input
                  type="text"
                  required
                  value={formData.owner}
                  onChange={(e) => handleInputChange('owner', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0x..."
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Address with admin permissions for the vault.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Treasury Address
                </label>
                <input
                  type="text"
                  required
                  value={formData.treasury}
                  onChange={(e) => handleInputChange('treasury', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0x..."
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Address that will receive performance fees generated by the vault.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Performance Rate
                </label>
                <input
                  type="text"
                  required
                  value={formData.performanceRate}
                  onChange={(e) => handleInputChange('performanceRate', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="10"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Performance fee rate (e.g., 10 for 10%)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Redemption Fee
                </label>
                <input
                  type="text"
                  required
                  value={formData.divestFee}
                  onChange={(e) => handleInputChange('divestFee', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="5"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Redemption fee rate (e.g., 5 for 5%)</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Starting Price
                {assetDecimals !== null && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    (Decimals: {assetDecimals})
                  </span>
                )}
              </label>
              <input
                type="text"
                required
                value={formData.startingPrice}
                onChange={(e) => handleInputChange('startingPrice', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="1.0"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Initial price per share. Will be parsed with {assetDecimals !== null ? assetDecimals : 'asset'} decimals.
                {assetDecimals === null && formData.asset && isAddress(formData.asset) && (
                  <span className="text-yellow-600 dark:text-yellow-400"> Fetching decimals...</span>
                )}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vesting Start
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.vestingStart}
                  onChange={(e) => handleInputChange('vestingStart', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Timestamp when vesting begins. Before this date, shares become redeemable gradually over time.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vesting End
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.vestingEnd}
                  onChange={(e) => handleInputChange('vestingEnd', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Timestamp when vesting is fully completed.</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-primary/20 border hover:bg-primary/40 text-primary font-semibold rounded-lg font-medium transition-colors cursor-pointer"
            >
              {loading ? 'Creating Vault...' : 'Launch Vault'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

