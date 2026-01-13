'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { BrowserWallet } from '@meshsdk/core';

export function WalletConnect() {
	const { connected, address, loading, connectWallet, disconnect } = useWallet();
	const [showWallets, setShowWallets] = useState(false);
	const [availableWallets, setAvailableWallets] = useState<string[]>([]);

	const handleShowWallets = async () => {
		const wallets = BrowserWallet.getInstalledWallets();
		setAvailableWallets(wallets.map((w) => w.name));
		setShowWallets(true);
	};

	const handleConnect = async (walletName: string) => {
		await connectWallet(walletName);
		setShowWallets(false);
	};

	const formatAddress = (addr: string) => {
		if (!addr) return '';
		return `${addr.slice(0, 12)}...${addr.slice(-8)}`;
	};

	if (connected && address) {
		return (
			<div className="wallet-connected">
				<span className="wallet-address">{formatAddress(address)}</span>
				<button onClick={disconnect} className="btn-disconnect">
					Disconnect
				</button>
			</div>
		);
	}

	return (
		<div className="wallet-connect">
			{!showWallets ? (
				<button onClick={handleShowWallets} className="btn-connect" disabled={loading}>
					{loading ? 'Connecting...' : 'Connect Wallet'}
				</button>
			) : (
				<div className="wallet-list">
					<p>Choose a wallet:</p>
					{availableWallets.length === 0 ? (
						<p className="no-wallets">
							No Cardano wallets found. Please install a wallet extension like Nami, Eternl, or Lace.
						</p>
					) : (
						<div className="wallet-options">
							{availableWallets.map((walletName) => (
								<button key={walletName} onClick={() => handleConnect(walletName)} className="wallet-option">
									{walletName}
								</button>
							))}
						</div>
					)}
					<button onClick={() => setShowWallets(false)} className="btn-cancel">
						Cancel
					</button>
				</div>
			)}
		</div>
	);
}
