import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';

interface MetaMaskState {
    isConnected: boolean;
    account: string | null;
    chainId: number | null;
    balance: string | null;
    isLoading: boolean;
    error: string | null;
}

interface PaymentDetails {
    productVariant: string;
    ethAmount: string;
    usdPrice: string;
}

export function useMetaMask() {
    const [state, setState] = useState<MetaMaskState>({
        isConnected: false,
        account: null,
        chainId: null,
        balance: null,
        isLoading: false,
        error: null,
    });

    // Payment address (replace with your actual payment address)
    const PAYMENT_ADDRESS = '0x0146311BDb312198b64c905fc249a35770Dd9193'.toLowerCase(); // Replace with your actual address

    // Check if MetaMask is installed
    const isMetaMaskInstalled = useCallback(() => {
        return typeof window !== 'undefined' && Boolean(window.ethereum);
    }, []);

    // Connect to MetaMask
    const connect = useCallback(async () => {
        if (!isMetaMaskInstalled() || !window.ethereum) {
            toast.error('MetaMask is not installed!');
            return;
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts',
            }) as string[];

            if (accounts && accounts.length > 0) {
                const provider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
                const network = await provider.getNetwork();
                const balance = await provider.getBalance(accounts[0]);

                setState(prev => ({
                    ...prev,
                    isConnected: true,
                    account: accounts[0],
                    chainId: Number(network.chainId),
                    balance: ethers.formatEther(balance),
                    isLoading: false,
                }));

                toast.success('MetaMask connected successfully!');
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to connect to MetaMask';
            setState(prev => ({
                ...prev,
                error: errorMessage,
                isLoading: false,
            }));
            toast.error('Failed to connect to MetaMask');
        }
    }, [isMetaMaskInstalled]);

    // Disconnect MetaMask
    const disconnect = useCallback(() => {
        setState({
            isConnected: false,
            account: null,
            chainId: null,
            balance: null,
            isLoading: false,
            error: null,
        });
        toast.success('MetaMask disconnected');
    }, []);

    // Switch to Ethereum Mainnet
    const switchToMainnet = useCallback(async () => {
        if (!isMetaMaskInstalled() || !window.ethereum) return;

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x1' }], // Ethereum Mainnet
            });
        } catch (error: unknown) {
            const ethError = error as { code?: number };
            if (ethError.code === 4902 && window.ethereum) {
                // Network not added, add it
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0x1',
                        chainName: 'Ethereum Mainnet',
                        nativeCurrency: {
                            name: 'Ether',
                            symbol: 'ETH',
                            decimals: 18,
                        },
                        rpcUrls: ['https://mainnet.infura.io/v3/', 'https://eth-mainnet.g.alchemy.com/v2/'],
                        blockExplorerUrls: ['https://etherscan.io/'],
                    }],
                });
            }
        }
    }, [isMetaMaskInstalled]);

    // Send payment
    const sendPayment = useCallback(async (paymentDetails: PaymentDetails): Promise<string> => {
        if (!state.isConnected || !state.account) {
            throw new Error('MetaMask not connected');
        }

        if (!window.ethereum) {
            throw new Error('MetaMask not available');
        }

        if (state.chainId !== 1) {
            toast.error('Please switch to Ethereum Mainnet');
            await switchToMainnet();
            throw new Error('Please switch to Ethereum Mainnet');
        }

        setState(prev => ({ ...prev, isLoading: true }));

        try {
            const provider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
            const signer = await provider.getSigner();

            // Create transaction
            const tx = {
                to: PAYMENT_ADDRESS,
                value: ethers.parseEther(paymentDetails.ethAmount),
                gasLimit: 21000, // Standard gas limit for ETH transfer
            };

            // Send transaction
            const transaction = await signer.sendTransaction(tx);
            toast.success('Transaction sent! Waiting for confirmation...');

            // Wait for confirmation
            const receipt = await transaction.wait();

            if (receipt?.status === 1) {
                toast.success('Payment successful!');
                setState(prev => ({ ...prev, isLoading: false }));
                return transaction.hash;
            } else {
                throw new Error('Transaction failed');
            }
        } catch (error: unknown) {
            const ethError = error as { code?: number; message?: string };
            const errorMessage = ethError.message || 'Payment failed';

            setState(prev => ({
                ...prev,
                error: errorMessage,
                isLoading: false,
            }));

            if (ethError.code === 4001) {
                toast.error('Transaction cancelled by user');
            } else {
                toast.error('Payment failed: ' + errorMessage);
            }
            throw error;
        }
    }, [state.isConnected, state.account, state.chainId, switchToMainnet, PAYMENT_ADDRESS]);

    // Check connection status on mount
    useEffect(() => {
        if (!isMetaMaskInstalled() || !window.ethereum) return;

        const checkConnection = async () => {
            try {
                const accounts = await window.ethereum!.request({
                    method: 'eth_accounts',
                }) as string[];

                if (accounts && accounts.length > 0) {
                    const provider = new ethers.BrowserProvider(window.ethereum! as ethers.Eip1193Provider);
                    const network = await provider.getNetwork();
                    const balance = await provider.getBalance(accounts[0]);

                    setState(prev => ({
                        ...prev,
                        isConnected: true,
                        account: accounts[0],
                        chainId: Number(network.chainId),
                        balance: ethers.formatEther(balance),
                    }));
                }
            } catch (error) {
                console.error('Failed to check MetaMask connection:', error);
            }
        };

        checkConnection();

        // Listen for account changes
        const handleAccountsChanged = (...args: unknown[]) => {
            const accounts = args[0] as string[];
            if (accounts.length === 0) {
                disconnect();
            } else {
                setState(prev => ({ ...prev, account: accounts[0] }));
            }
        };

        // Listen for chain changes
        const handleChainChanged = (...args: unknown[]) => {
            const chainId = args[0] as string;
            setState(prev => ({ ...prev, chainId: parseInt(chainId, 16) }));
        };

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        return () => {
            if (window.ethereum?.removeListener) {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            }
        };
    }, [isMetaMaskInstalled, disconnect]);

    return {
        ...state,
        isMetaMaskInstalled: isMetaMaskInstalled(),
        connect,
        disconnect,
        switchToMainnet,
        sendPayment,
    };
}

// Extend Window interface for TypeScript
interface EthereumProvider {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on: (event: string, handler: (...args: unknown[]) => void) => void;
    removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    // Add ethers.js compatibility
    send?: (method: string, params?: unknown[]) => Promise<unknown>;
    sendAsync?: (request: { method: string; params?: unknown[] }, callback: (error: Error | null, result?: unknown) => void) => void;
}

declare global {
    interface Window {
        ethereum?: EthereumProvider;
    }
}
