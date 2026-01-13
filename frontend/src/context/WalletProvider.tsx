'use client';

import { createContext, useEffect, useState } from 'react';
import { BrowserWallet } from '@meshsdk/core';

type WalletContextType = {
	wallet: BrowserWallet | null;
	connected: boolean;
	address: string;
	loading: boolean;
	connectWallet: (walletName: string) => Promise<void>;
	disconnect: () => void;
};

export const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
	const [wallet, setWallet] = useState<BrowserWallet | null>(null);
	const [connected, setConnected] = useState(false);
	const [address, setAddress] = useState<string>('');
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const savedWalletName = localStorage.getItem('connectedWallet');
		if (savedWalletName) {
			connectWallet(savedWalletName).catch(() => {});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const connectWallet = async (walletName: string) => {
		try {
			setLoading(true);
			const browserWallet = await BrowserWallet.enable(walletName);
			const walletAddress = await browserWallet.getChangeAddress();

			setWallet(browserWallet);
			setAddress(walletAddress);
			setConnected(true);
			localStorage.setItem('connectedWallet', walletName);
		} catch (error) {
			setConnected(false);
			setWallet(null);
			setAddress('');
			throw error;
		} finally {
			setLoading(false);
		}
	};

	const disconnect = () => {
		setWallet(null);
		setAddress('');
		setConnected(false);
		localStorage.removeItem('connectedWallet');
	};

	return (
		<WalletContext.Provider value={{ wallet, connected, address, loading, connectWallet, disconnect }}>
			{children}
		</WalletContext.Provider>
	);
}

