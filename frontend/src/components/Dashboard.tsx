'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useSmartWallet } from '@/hooks/useSmartWallet';
import { WalletConnect } from './WalletConnect';
import { SendToWallet } from './SendToWallet';
import { WithdrawFunds } from './WithdrawFunds';

export function Dashboard() {
	const { connected, address } = useWallet();
	const { contractUTxOs, fetchContractUTxOs, getContractAddress } = useSmartWallet();
	const [contractAddress, setContractAddress] = useState<string>('');

	useEffect(() => {
		if (connected && address) {
			const loadAddressAndFetch = async () => {
				try {
					setContractAddress('Loading...');
					const contractAddr = await getContractAddress();
					setContractAddress(contractAddr);
					await fetchContractUTxOs();
				} catch (error: any) {
					const errorMsg = error?.message || 'Unknown error';
					setContractAddress(`Error: ${errorMsg}`);
				}
			};

			loadAddressAndFetch();
		} else {
			setContractAddress('');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [connected, address]);

	const totalLocked = contractUTxOs.reduce((sum, utxo) => {
		const amount = utxo.output.amount.find((a: any) => a.unit === 'lovelace')?.quantity || '0';
		return sum + parseInt(amount);
	}, 0);

	const formatAda = (lovelace: number) => {
		return (lovelace / 1_000_000).toFixed(2);
	};

	if (!connected) {
		return (
			<div className="dashboard-connect">
				<h1>Smart Wallet Dashboard</h1>
				<p>Connect your wallet to get started</p>
				<WalletConnect />
			</div>
		);
	}

	return (
		<div className="dashboard">
			<header className="dashboard-header">
				<h1>Smart Wallet Dashboard</h1>
				<WalletConnect />
			</header>

			<div className="dashboard-stats">
				<div className="stat-card">
					<h3>Contract Address</h3>
					<p className="contract-address">{contractAddress || 'Loading...'}</p>
				</div>

				<div className="stat-card">
					<h3>Total Locked</h3>
					<p className="stat-value">{formatAda(totalLocked)} ADA</p>
				</div>

				<div className="stat-card">
					<h3>UTxOs</h3>
					<p className="stat-value">{contractUTxOs.length}</p>
				</div>
			</div>

			<div className="dashboard-content">
				<div className="dashboard-section">
					<SendToWallet />
				</div>

				<div className="dashboard-section">
					<WithdrawFunds utxos={contractUTxOs} onWithdrawComplete={fetchContractUTxOs} />
				</div>
			</div>
		</div>
	);
}
