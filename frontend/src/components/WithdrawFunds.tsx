'use client';

import { useSmartWallet } from '@/hooks/useSmartWallet';
import { useState } from 'react';

interface WithdrawFundsProps {
	utxos: any[];
	onWithdrawComplete?: () => void;
}

export function WithdrawFunds({ utxos, onWithdrawComplete }: WithdrawFundsProps) {
	const { withdrawFromContract, loading } = useSmartWallet();
	const [selectedUtxo, setSelectedUtxo] = useState<any>(null);
	const [txHash, setTxHash] = useState('');
	const [error, setError] = useState('');

	const formatAda = (lovelace: string) => {
		return (parseInt(lovelace) / 1_000_000).toFixed(2);
	};

	const isLocked = (utxo: any) => {
		if (!utxo.datumValue) {
			return false;
		}

		const now = Date.now();
		return utxo.datumValue > now;
	};

	const getTimeRemaining = (timestamp: number) => {
		const now = Date.now();
		const diff = timestamp - now;

		if (diff <= 0) {
			return 'Unlocked';
		}

		const minutes = Math.floor(diff / 60000);
		const seconds = Math.floor((diff % 60000) / 1000);
		return `${minutes}m ${seconds}s remaining`;
	};

	const handleWithdraw = async (utxo: any) => {
		if (isLocked(utxo)) {
			setError('This UTxO is still time-locked');
			return;
		}

		setError('');
		setTxHash('');
		setSelectedUtxo(utxo);

		try {
			const hash = await withdrawFromContract(utxo);
			setTxHash(hash);
			onWithdrawComplete?.();
		} catch (err: any) {
			setError(err?.message || 'Withdrawal failed');
		} finally {
			setSelectedUtxo(null);
		}
	};

	return (
		<div className="withdraw-funds">
			<h2>Withdraw from Contract</h2>

			{utxos.length === 0 ? (
				<p className="no-utxos">No funds in contract yet.</p>
			) : (
				<div className="utxo-list">
					{utxos.map((utxo, index) => {
						const locked = isLocked(utxo);
						const amount = utxo.output.amount.find((a: any) => a.unit === 'lovelace')?.quantity || '0';

						return (
							<div
								key={`${utxo.input.txHash}-${utxo.input.outputIndex}`}
								className={`utxo-card ${locked ? 'locked' : 'unlocked'}`}>
								<div className="utxo-info">
									<span className="utxo-amount">{formatAda(amount)} ADA</span>
									{utxo.datumValue ? (
										<span className="utxo-lock">🔒 {locked ? getTimeRemaining(utxo.datumValue) : 'Unlocked'}</span>
									) : (
										<span className="utxo-lock">🔓 No lock</span>
									)}
								</div>

								<button onClick={() => handleWithdraw(utxo)} disabled={loading || locked} className="btn-withdraw">
									{loading && selectedUtxo === utxo ? 'Withdrawing...' : 'Withdraw'}
								</button>
							</div>
						);
					})}
				</div>
			)}

			{txHash && (
				<div className="success-message">
					<p>✅ Withdrawal successful!</p>
					<p className="tx-hash">
						Tx: <code>{txHash.slice(0, 16)}...</code>
					</p>
				</div>
			)}

			{error && (
				<div className="error-message">
					<p>❌ {error}</p>
				</div>
			)}
		</div>
	);
}
