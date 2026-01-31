'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useChainId } from 'wagmi';

import { ConnectButton, darkTheme } from "thirdweb/react";
import { createWallet } from "thirdweb/wallets";
import { createThirdwebClient, defineChain } from "thirdweb";

const client = createThirdwebClient({ clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID! });
const customChain = defineChain({
  id: Number(process.env.NEXT_PUBLIC_NETWORK_ID!),
  name: "Sepolia Ethereum",
  rpc: process.env.NEXT_PUBLIC_SEPOLIA_RPC!,
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18
  }
})

export function Navbar() {
  const pathname = usePathname();
  const chainId = useChainId();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Flying Vaults', href: '/vaults' },
    { name: 'Faucet', href: '/faucet' },
  ];

  return (
    <nav className="w-full border-b border-gray-200 dark:border-primary bg-white/80 dark:bg-black/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center">
                <Image
                  className="object-cover w-fit h-10"
                  src="/images/logo-wordmark-white.png"
                  alt="Flying Protocol Logo"
                  width={100}
                  height={50}
                />
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:ml-8 md:flex md:space-x-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`inline-flex items-center px-3 py-2 text-lg font-medium rounded-md transition-colors
                    ${pathname === item.href
                      ? 'text-gray-900 dark:text-white underline'
                      : 'text-gray-600 dark:text-white dark:hover:text-primary'
                    }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Desktop Wallet Connect Button and Testnet Badge */}
          <div className="hidden md:flex md:items-center md:gap-4">
            {chainId === 11155111 && (
              <div className="px-4 py-1 dark:bg-primary/20 text-blue-800 dark:text-primary text-md font-medium rounded-full">
                <span>Sepolia Testnet</span>
              </div>
            )}
            <ConnectButton
              client={client}
              chain={customChain}
              chains={[customChain]}
              wallets={[
                createWallet("io.metamask"),
                createWallet("com.coinbase.wallet"),
                createWallet("me.rainbow"),
              ]}
              theme={darkTheme({
                colors: {
                  primaryButtonBg: "#0e444c",
                  primaryButtonText: "#ffffff",
                  connectedButtonBg: "#042024ff",
                  connectedButtonBgHover: "#052d33ff",
                  secondaryIconColor: "hsl(0, 0%, 63%)",
                },
              })}
              connectModal={{
                showThirdwebBranding: false,
                size: "compact",
                title: "Connect wallet",
                titleIcon: "https://app.flying.fund/icons/logo.png",
              }}
              connectButton={{ label: "Connect wallet" }}
            />
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <span className="sr-only">Open main menu</span>
              {/* Icon when menu is closed */}
              {!isMobileMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block px-3 py-2 text-base font-medium ${pathname === item.href
                  ? 'text-gray-900 dark:text-white underline'
                  : 'text-gray-600 dark:text-white dark:hover:text-primary'
                  }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200 dark:border-primary">
            <div className="px-3 space-y-3 right">
              <ConnectButton
                client={client}
                chain={customChain}
                chains={[customChain]}
                wallets={[
                  createWallet("io.metamask"),
                  createWallet("com.coinbase.wallet"),
                  createWallet("me.rainbow"),
                ]}
                theme={darkTheme({
                  colors: {
                    primaryButtonBg: "#0e444c",
                    primaryButtonText: "#ffffff",
                    connectedButtonBg: "#042024ff",
                    connectedButtonBgHover: "#052d33ff",
                    secondaryIconColor: "hsl(0, 0%, 63%)",
                  },
                })}
                connectModal={{
                  showThirdwebBranding: false,
                  size: "compact",
                  title: "Connect wallet",
                  titleIcon: "https://app.flying.fund/icons/logo.png",
                }}
                connectButton={{ label: "Connect wallet" }}
              />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

