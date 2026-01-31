const sepoliaRPC = process.env.NEXT_PUBLIC_SEPOLIA_RPC || 'https://eth-sepolia.api.onfinality.io/public';
const mainnetRPC = process.env.NEXT_PUBLIC_MAINNET_RPC || 'https://eth.llamarpc.com/';

export const chains = {
  sepolia: {
    id: 11155111,
    name: "Ethereum Sepolia",
    rpc: sepoliaRPC,
    blockExplorerUrl: "https://sepolia.etherscan.io",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18
    }
  },
  mainnet: {
    id: 1,
    name: "Ethereum Mainnet",
    rpc: mainnetRPC,
    blockExplorerUrl: "https://etherscan.io",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18
    }
  }
}

export const chainByID = (id: number) => {
  return Object.values(chains).find(chain => chain.id === id) || chains.mainnet;
}
