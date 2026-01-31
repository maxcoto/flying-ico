import { formatNumber } from '@/app/utils/helper';
import { useState } from 'react';
import { DivestModal } from './DivestModal';
import { UnlockModal } from './UnlockModal';
import { type Address } from 'viem';

interface FlyingPosition {
    id: string;
    positionId: string;
    user: string;
    assetAmount: string;
    shareAmount: string;
    initialAssets: string;
    sharesUnlocked: string;
    assetsDivested: string;
    vestingAmount: string;
    isClosed: boolean;
    createdAt: string;
}

interface PositionCardProps {
    position: FlyingPosition;
    vaultAddress: Address;
    vaultDecimals: string;
    vestingRate: number;
    pricePerShare: number;
    assetAddress: Address;
    vaultSymbol: string;
    vaultDivestFee: number;
}

export function PositionCard({ position, vaultAddress, vaultDecimals, vestingRate, pricePerShare, assetAddress, vaultSymbol, vaultDivestFee }: PositionCardProps) {
    const [isDivestModalOpen, setIsDivestModalOpen] = useState(false);
    const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
    
    const positionShare = formatNumber(position.shareAmount, vaultDecimals);
    const vestingAmount = formatNumber(position.vestingAmount, vaultDecimals);
    const divestibleShares = parseFloat((vestingAmount * vestingRate) - (vestingAmount - positionShare) + "");
    const vestedShares = parseFloat((positionShare * (1 - vestingRate)) + "").toFixed(2);

    // Calculate profit/loss
    const initialAssets = formatNumber(position.initialAssets, vaultDecimals);
    const assetsDivested = formatNumber(position.assetsDivested, vaultDecimals);
    const assetsDivestedAfterFee = assetsDivested * (1-vaultDivestFee);
    const initialValue = initialAssets - assetsDivested;

    const sharesUnlocked = formatNumber(position.sharesUnlocked, vaultDecimals);
    const finalValue = (positionShare + sharesUnlocked) * pricePerShare;

    const profitLoss = parseFloat(finalValue + "") - parseFloat(initialValue + "");
    const profitLossPercentage = initialValue > 0 ? ((profitLoss / initialValue) * 100).toFixed(2) : "0.00";
    const isProfit = profitLoss > -0.00000001;

    const redeemableValue = formatNumber(position.assetAmount, vaultDecimals) * (1-vaultDivestFee);

    return (
        <>
        <div className="bg-white dark:bg-dark-primary rounded-xl p-6 transition-all duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        Position #{position.positionId}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Created: {new Date(parseInt(position.createdAt) * 1000).toLocaleDateString()}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsDivestModalOpen(true)}
                        className="px-3 py-1.5 bg-secondary/80 hover:bg-secondary/90 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors"
                    >
                        Redeem
                    </button>
                    <button 
                        onClick={() => setIsUnlockModalOpen(true)}
                        className="px-3 py-1.5 bg-[#2fc7a8]/80 hover:bg-[#2fc7a8]/90 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors"
                    >
                        Claim
                    </button>
                </div>
            </div>

            {/* Main Stats Grid */}

            <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Redeemable Shares</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {divestibleShares.toFixed(2)}
                    </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Claimable Shares</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {formatNumber(position.shareAmount, vaultDecimals).toFixed(2)}
                    </p>
                </div>
            </div>

            <div className="border-t border-gray-700 pt-4 grid grid-cols-2 lg:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Redeemable Value</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {redeemableValue.toFixed(2)}
                    </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    <p className={`text-xs mb-1 font-bold ${isProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>P&L</p>
                    <div className="flex items-center gap-1">
                        <p className={`text-lg font-semibold ${isProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {isProfit ? '+' : ''}{profitLoss.toFixed(2)}
                        </p>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${isProfit ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {isProfit ? '+' : ''}{profitLossPercentage}%
                        </span>
                    </div>
                </div>
            </div>

            {/* <div className="border-t border-gray-700 pt-4 grid grid-cols-2 lg:grid-cols-2 gap-4 mb-4">
                
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Assets Redeemed</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {assetsDivestedAfterFee.toFixed(2)}
                    </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Shares Claimed</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {formatNumber(position.sharesUnlocked, vaultDecimals).toFixed(2)}
                    </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Non-Redeemable Shares</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {vestedShares}
                    </p>
                </div>

            </div> */}

            {/* Vesting Information */}
            <div className="">
                {/* Vesting Progress Bar */}
                <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>Redemption Rights Expiration Progress</span>
                        <span>{((1 - vestingRate) * 100).toFixed(2)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-primary to-green-800 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(1 - vestingRate) * 100}%` }}
                        ></div>
                    </div>
                </div>
            </div>

        </div>

        {/* Modals */}
        <DivestModal
            isOpen={isDivestModalOpen}
            onClose={() => setIsDivestModalOpen(false)}
            vaultAddress={vaultAddress}
            positionId={position.positionId}
            maxShares={divestibleShares}
            vaultDecimals={vaultDecimals}
            assetAddress={assetAddress}
            divestFee={vaultDivestFee}
            pricePerShare={pricePerShare}
        />
        <UnlockModal
            isOpen={isUnlockModalOpen}
            onClose={() => setIsUnlockModalOpen(false)}
            vaultAddress={vaultAddress}
            positionId={position.positionId}
            maxShares={positionShare}
            vaultDecimals={vaultDecimals}
            vaultSymbol={vaultSymbol}
        />
        </>
    );
}
