'use client';

import { useState } from 'react';
import { useSmartWallet } from '@/hooks/useSmartWallet';

export function SendToWallet() {
	const { sendToContract, loading } = useSmartWallet();
	const [amount, setAmount] = useState('');
	const [useTimeLock, setUseTimeLock] = useState(false);
	const [lockMinutes, setLockMinutes] = useState('30');
	const [txHash, setTxHash] = useState('');
	const [error, setError] = useState('');

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setTxHash('');

		try {
			const amountLovelace = parseFloat(amount) * 1_000_000;

			if (amountLovelace < 1_000_000) {
				setError('Minimum amount is 1 ADA');
				return;
			}

			let datum = null;
			if (useTimeLock) {
				const minutes = parseInt(lockMinutes);
				const lockTime = Date.now() + minutes * 60 * 1000;
				datum = lockTime;
			}

			const hash = await sendToContract(amountLovelace, datum);
			setTxHash(hash);
			setAmount('');
			setUseTimeLock(false);
			setLockMinutes('30');
		} catch (err: any) {
			setError(err?.message || 'Transaction failed');
		}
	};

	return (
		<div className="send-to-wallet">
			<h2>Send to Smart Wallet</h2>

			<form onSubmit={handleSubmit}>
				<div className="form-group">
					<label htmlFor="amount">Amount (ADA)</label>
					<input
						id="amount"
						type="number"
						step="0.1"
						min="1"
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						placeholder="5.0"
						required
						disabled={loading}
					/>
				</div>

				<div className="form-group checkbox-group">
					<label>
						<input
							type="checkbox"
							checked={useTimeLock}
							onChange={(e) => setUseTimeLock(e.target.checked)}
							disabled={loading}
						/>
						Add time-lock
					</label>
				</div>

				{useTimeLock && (
					<div className="form-group">
						<label htmlFor="lockMinutes">Lock duration (minutes)</label>
						<input
							id="lockMinutes"
							type="number"
							min="1"
							value={lockMinutes}
							onChange={(e) => setLockMinutes(e.target.value)}
							disabled={loading}
						/>
						<small>Funds will be locked for {lockMinutes} minutes</small>
					</div>
				)}

				<button type="submit" className="btn-primary" disabled={loading || !amount}>
					{loading ? 'Sending...' : 'Send to Contract'}
				</button>
			</form>

			{txHash && (
				<div className="success-message">
					<p>✅ Transaction submitted!</p>
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
