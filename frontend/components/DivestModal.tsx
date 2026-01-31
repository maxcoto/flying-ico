'use client';

import { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { writeContract, waitForTransactionReceipt } from '@wagmi/core';
import { config } from '@/lib/wagmi';
import { parseUnits, formatUnits, type Address } from 'viem';
import FlyingICOABI from '@/app/abis/FlyingICO.json';
import { formatNumber } from '@/app/utils/helper';
import { chainByID } from '@/app/utils/chains';
import { getTokenPicture } from '@/app/utils/logos';
import toast from 'react-hot-toast';

interface DivestModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultAddress: Address;
  positionId: string;
  maxShares: number; // divestible shares
  vaultDecimals: string;
  assetAddress: Address;
  divestFee: number; // redemption fee as a decimal (e.g., 0.01 for 1%)
  pricePerShare: number; // price per share
}

export function DivestModal({
  isOpen,
  onClose,
  vaultAddress,
  positionId,
  maxShares,
  vaultDecimals,
  assetAddress,
  divestFee,
  pricePerShare
}: DivestModalProps) {
  const { address: userAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const chain = chainByID(chainId);
  const [sharesAmount, setSharesAmount] = useState('');
  const [isDivesting, setIsDivesting] = useState(false);
  const [txStatus, setTxStatus] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSharesAmount('');
      setTxStatus('');
      setTxHash('');
    }
  }, [isOpen]);

  const handleDivest = async () => {
    if (!userAddress || !sharesAmount || !isConnected) return;

    setIsDivesting(true);
    setTxStatus('Waiting for wallet confirmation...');
    setTxHash('');

    try {
      const sharesBN = parseUnits(sharesAmount, Number(vaultDecimals));
      const positionIdBN = BigInt(positionId);

      toast.loading('Please confirm the divest transaction in your wallet', { id: 'divest' });

      const hash = await writeContract(config, {
        address: vaultAddress,
        abi: FlyingICOABI,
        functionName: 'divest',
        args: [positionIdBN, sharesBN],
      });

      setTxHash(hash);
      setTxStatus('Transaction submitted. Waiting for confirmation...');
      toast.loading('Transaction submitted. Waiting for confirmation...', { id: 'divest' });

      const receipt = await waitForTransactionReceipt(config, { hash });

      setTxStatus('Transaction confirmed!');
      toast.success('Divest successful!', { id: 'divest' });

      // Wait a moment before closing to show success
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSharesAmount('');
      setTxStatus('');
      setTxHash('');
      onClose();
      window.location.reload();
    } catch (error: any) {
      console.error('Divest error:', error);
      const errorMessage = error?.message?.includes('User rejected')
        ? 'Divest cancelled'
        : 'Divest failed. Please try again.';
      toast.error(errorMessage, { id: 'divest' });
      setTxStatus('');
      setTxHash('');
    } finally {
      setIsDivesting(false);
    }
  };

  const handleMax = () => {
    setSharesAmount(maxShares.toFixed(6));
  };

  const isValidAmount = () => {
    if (!sharesAmount) return false;
    try {
      const amount = parseFloat(sharesAmount);
      return amount > 0 && amount <= maxShares;
    } catch {
      return false;
    }
  };

  // Calculate the amount user will receive after fees
  const calculateAmountAfterFee = () => {
    if (!sharesAmount || !isValidAmount()) return 0;
    try {
      const shares = parseFloat(sharesAmount);
      const assetValue = shares * pricePerShare;
      const amountAfterFee = assetValue * (1 - divestFee);
      return amountAfterFee;
    } catch {
      return 0;
    }
  };

  const amountAfterFee = calculateAmountAfterFee();
  const divestFeePercentage = (divestFee * 100).toFixed(2);

  const assetPicture = getTokenPicture("sepolia".toString(), assetAddress.toString());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-dark-primary rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Redeem Shares</h2>
          <button
            onClick={onClose}
            disabled={isDivesting}
            className="text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ×
          </button>
        </div>

        {/* Info */}
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">Max Redeemable Shares:</span>
            <span className="font-medium text-gray-900 dark:text-white">{maxShares.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Redemption Fee:</span>
            <span className="font-medium text-red-600 dark:text-red-400">{divestFeePercentage}%</span>
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Shares to Redeem
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={sharesAmount}
              onChange={(e) => setSharesAmount(e.target.value)}
              placeholder="0.00"
              step="any"
              max={maxShares}
              disabled={isDivesting}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleMax}
              disabled={isDivesting}
              className="px-4 py-2 bg-gray-200 cursor-pointer dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              MAX
            </button>
          </div>
          {sharesAmount && !isValidAmount() && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              Amount must be between 0 and {maxShares.toFixed(2)}
            </p>
          )}
        </div>

        {/* Amount After Fee */}
        {sharesAmount && isValidAmount() && (
          <div className="mb-6 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">You will receive:</span>
              <div className='flex'>
                <span className="my-auto font-semibold text-green-700 dark:text-green-400">
                  {amountAfterFee.toFixed(6)}
                </span>
                <img src={assetPicture} alt="Asset" className="w-4 h-4 my-auto ml-1" />
              </div>
              
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              After {divestFeePercentage}% redemption fee deduction
            </p>
          </div>
        )}

        {/* Transaction Status */}
        {(isDivesting || txStatus) && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {txStatus || 'Processing redeem...'}
                </p>
                {txHash && (
                  <div className="mt-1">
                    <a
                      href={`${chain.blockExplorerUrl}/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-mono"
                    >
                      View on Explorer: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleDivest}
            disabled={!isValidAmount() || isDivesting}
            className="flex-1 px-4 py-3 cursor-pointer bg-secondary/60 hover:bg-secondary/80 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isDivesting ? 'Redeeming...' : 'Redeem'}
          </button>
          <button
            onClick={onClose}
            disabled={isDivesting}
            className="px-4 py-3 bg-gray-200 cursor-pointer dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
