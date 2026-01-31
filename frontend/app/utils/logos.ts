export const tokens: Record<string, Record<string, string>> = {
  sepolia: {
    // ETHER
    '0x0000000000000000000000000000000000000000': '/tokens/eth.svg',
    // WETH
    '0x90e9942fe624bc1c36463f895dd367d04d571b2a': '/tokens/weth.svg',
    // USDC
    '0xd6eddb13ad13767a2b4ad89ea94fca0c6ab0f8d2': '/tokens/usdc.svg',
    // USDT
    '0x2b36461ac773c6ca3728fd29aa51c5d8d4995561': '/tokens/usdt.svg',
    // WBTC
    '0x2c16b6d715af41c7ab01e7bfeba497768982b906': '/tokens/wbtc.svg',
    // DAI
    '0xc746631571dac7a2f6c2cf1d54c8691d97405b41': '/tokens/dai.svg',
  },
  mainnet: {
    // ETHER
    '0x0000000000000000000000000000000000000000': '/tokens/eth.svg',
    // WETH
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': '/tokens/weth.svg',
    // USDC
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '/tokens/usdc.svg',
    // USDT
    '0xdac17f958d2ee523a2206206994597c13d831ec7': '/tokens/usdt.svg',
    // WBTC
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': '/tokens/wbtc.svg',
    // DAI
    '0x6b175474e89094c44da98b954eedeac495271d0f': '/tokens/dai.svg',
  },
};

export const getTokenPicture = (chain: string, address: string): string => {
  const normalizedAddress = address.toLowerCase();
  return tokens[chain][normalizedAddress] || '/icons/logo.png';
};
