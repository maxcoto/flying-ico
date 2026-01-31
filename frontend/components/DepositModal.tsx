'use client';

import { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { readContract, writeContract, waitForTransactionReceipt } from '@wagmi/core';
import { config } from '@/lib/wagmi';
import { parseUnits, formatUnits, erc20Abi, type Address } from 'viem';
import FlyingICOABI from '@/app/abis/FlyingICO.json';
import { formatNumber } from '@/app/utils/helper';
import { chainByID } from '@/app/utils/chains';
import toast from 'react-hot-toast';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultAddress: Address;
  assetAddress: Address;
  assetDecimals: string;
  assetSymbol: string;
}

export function DepositModal({
  isOpen,
  onClose,
  vaultAddress,
  assetAddress,
  assetDecimals,
  assetSymbol,
}: DepositModalProps) {
  const { address: userAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const chain = chainByID(chainId);
  const [depositAmount, setDepositAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState<bigint>(BigInt(0));
  const [allowance, setAllowance] = useState<bigint>(BigInt(0));
  const [symbol, setSymbol] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [step, setStep] = useState<'approve' | 'deposit'>('approve');
  const [txStatus, setTxStatus] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [previewShares, setPreviewShares] = useState<bigint>(BigInt(0));

  // Load wallet balance and allowance
  useEffect(() => {
    if (!isOpen || !userAddress || !isConnected) return;

    async function loadData() {
      try {
        if (!userAddress) return;

        // Get wallet balance
        const balance = await readContract(config, {
          address: assetAddress,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [userAddress],
        });
        setWalletBalance(balance as bigint);

        // Get allowance
        const currentAllowance = await readContract(config, {
          address: assetAddress,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [userAddress, vaultAddress],
        });
        setAllowance(currentAllowance as bigint);

        // Get symbol
        const assetSymbol = await readContract(config, {
          address: assetAddress,
          abi: erc20Abi,
          functionName: 'symbol',
          args: [],
        });
        setSymbol(assetSymbol);
      } catch (error) {
        console.error('Error loading balance/allowance:', error);
      }
    }

    loadData();
  }, [isOpen, userAddress, isConnected, assetAddress, vaultAddress]);

  // Check if approval is needed and calculate preview shares
  useEffect(() => {
    if (!depositAmount) {
      setStep('approve');
      setPreviewShares(BigInt(0));
      return;
    }

    try {
      const amountBN = parseUnits(depositAmount, Number(assetDecimals));
      if (allowance >= amountBN) {
        setStep('deposit');
      } else {
        setStep('approve');
      }

      // Calculate preview shares
      async function calculatePreviewShares() {
        try {
          const shares = await readContract(config, {
            address: vaultAddress,
            abi: FlyingICOABI,
            functionName: 'previewDeposit',
            args: [amountBN],
          });
          setPreviewShares(shares as bigint);
        } catch (error) {
          console.error('Error calculating preview shares:', error);
          setPreviewShares(BigInt(0));
        }
      }

      calculatePreviewShares();
    } catch (error) {
      setStep('approve');
      setPreviewShares(BigInt(0));
    }
  }, [depositAmount, allowance, assetDecimals, vaultAddress]);

  const handleApprove = async () => {
    if (!userAddress || !depositAmount) return;

    setIsApproving(true);
    setTxStatus('Waiting for wallet confirmation...');
    setTxHash('');
    
    try {
      const amountBN = parseUnits(depositAmount, Number(assetDecimals));
      
      toast.loading('Please confirm the approval transaction in your wallet', { id: 'approve' });
      
      const hash = await writeContract(config, {
        address: assetAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [vaultAddress, amountBN],
      });

      setTxHash(hash);
      setTxStatus('Transaction submitted. Waiting for confirmation...');
      toast.loading('Transaction submitted. Waiting for confirmation...', { id: 'approve' });

      const receipt = await waitForTransactionReceipt(config, { hash });

      setTxStatus('Transaction confirmed!');
      toast.success('Approval successful!', { id: 'approve' });

      // Update allowance after approval
      const newAllowance = await readContract(config, {
        address: assetAddress,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [userAddress, vaultAddress],
      });
      setAllowance(newAllowance as bigint);
      setStep('deposit');
      setTxStatus('');
      setTxHash('');
    } catch (error: any) {
      console.error('Approval error:', error);
      const errorMessage = error?.message?.includes('User rejected') 
        ? 'Approval cancelled'
        : 'Approval failed. Please try again.';
      toast.error(errorMessage, { id: 'approve' });
      setTxStatus('');
      setTxHash('');
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeposit = async () => {
    if (!userAddress || !depositAmount) return;

    setIsDepositing(true);
    setTxStatus('Waiting for wallet confirmation...');
    setTxHash('');
    
    try {
      const amountBN = parseUnits(depositAmount, Number(assetDecimals));

      toast.loading('Please confirm the deposit transaction in your wallet', { id: 'deposit' });

      const hash = await writeContract(config, {
        address: vaultAddress,
        abi: FlyingICOABI,
        functionName: 'deposit',
        args: [amountBN, userAddress],
      });

      setTxHash(hash);
      setTxStatus('Transaction submitted. Waiting for confirmation...');
      toast.loading('Transaction submitted. Waiting for confirmation...', { id: 'deposit' });

      const receipt = await waitForTransactionReceipt(config, { hash });

      setTxStatus('Transaction confirmed!');
      toast.success('Deposit successful!', { id: 'deposit' });

      // Wait a moment before closing to show success
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reset and close
      setDepositAmount('');
      setTxStatus('');
      setTxHash('');
      onClose();
      // Reload page data
      window.location.reload();
    } catch (error: any) {
      console.error('Deposit error:', error);
      const errorMessage = error?.message?.includes('User rejected')
        ? 'Deposit cancelled'
        : 'Deposit failed. Please try again.';
      toast.error(errorMessage, { id: 'deposit' });
      setTxStatus('');
      setTxHash('');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleMax = () => {
    if (walletBalance > 0) {
      const balanceFormatted = formatUnits(walletBalance, Number(assetDecimals));
      setDepositAmount(balanceFormatted);
    }
  };

  if (!isOpen) return null;

  const balanceFormatted = formatNumber(walletBalance.toString(), assetDecimals);
  const allowanceFormatted = formatNumber(allowance.toString(), assetDecimals);
  const needsApproval = depositAmount && parseUnits(depositAmount || '0', Number(assetDecimals)) > allowance;
  const previewSharesFormatted = previewShares > 0 ? formatNumber(previewShares.toString(), assetDecimals) : 0;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-dark-primary rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Deposit {symbol}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Wallet Balance and Allowance Display */}
        <div className="mb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Wallet Balance:</span>
            <span className="font-medium text-gray-900 dark:text-white">{balanceFormatted.toFixed(2)} {symbol}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Approved Amount:</span>
            <span className="font-medium text-gray-900 dark:text-white">{allowanceFormatted.toFixed(2)} {symbol}</span>
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Amount
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0.00"
              step="any"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleMax}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium cursor-pointer"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Steps */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`flex-1 text-center py-2 ${step === 'approve' ? 'bg-primary/20 text-primary' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'} rounded-lg transition-colors`}>
              <span className="font-medium">1. Approve</span>
            </div>
            <div className="w-4 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
            <div className={`flex-1 text-center py-2 ${step === 'deposit' ? 'bg-primary/20 text-primary' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'} rounded-lg transition-colors`}>
              <span className="font-medium">2. Deposit</span>
            </div>
          </div>
        </div>

        {/* Transaction Status */}
        {(isApproving || isDepositing || txStatus) && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {txStatus || (isApproving ? 'Processing approval...' : 'Processing deposit...')}
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
          {needsApproval ? (
            <button
              onClick={handleApprove}
              disabled={!depositAmount || isApproving || (() => {
                try {
                  return depositAmount ? parseUnits(depositAmount, Number(assetDecimals)) > walletBalance : true;
                } catch {
                  return true;
                }
              })()}
              className="flex-1 px-4 py-3 bg-primary/20 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isApproving ? 'Approving...' : 'Approve'}
            </button>
          ) : (
            <button
              onClick={handleDeposit}
              disabled={!depositAmount || isDepositing}
              className="flex-1 px-4 py-3 bg-primary/60 hover:bg-primary/80 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isDepositing ? 'Depositing...' : 'Deposit'}
            </button>
          )}
          <button
            onClick={onClose}
            disabled={isApproving || isDepositing}
            className="px-4 py-3 cursor-pointer bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Shares Preview */}
        {depositAmount && previewShares > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Shares You Will Receive:</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {previewSharesFormatted.toFixed(2)} {assetSymbol}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
