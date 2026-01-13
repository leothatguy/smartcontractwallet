import { useState } from 'react';
import { Transaction, resolvePaymentKeyHash, deserializeDatum as deserializeCborDatum } from '@meshsdk/core';
import { useWallet } from './useWallet';
import { getCompiledCode } from '@/contracts/blueprint';
import { getContractAddress, encodeDatum, encodeRedeemer, decodeDatum } from '@/contracts/utils';
import { getProvider, getNetworkId } from '@/config/provider';
import type { OwnerCredential, WalletDatum } from '@/contracts/types';

export function useSmartWallet() {
	const { wallet, address: walletAddress } = useWallet();
	const [loading, setLoading] = useState(false);
	const [contractUTxOs, setContractUTxOs] = useState<any[]>([]);

	const getOwnerCredential = (): OwnerCredential => {
		if (!wallet) {
			throw new Error('Wallet not connected');
		}

		if (!walletAddress || walletAddress.trim() === '') {
			throw new Error('Wallet address not available; reconnect the wallet');
		}

		try {
			const hash = resolvePaymentKeyHash(walletAddress);

			if (!hash || typeof hash !== 'string') {
				throw new Error(`Derived hash is not a string. address=${walletAddress}`);
			}

			const trimmed = hash.trim();
			if (trimmed.length !== 56) {
				throw new Error(
					`Derived hash length ${trimmed.length}, expected 56. hash=${trimmed}, address=${walletAddress}`,
				);
			}

			return { type: 'VerificationKey', hash: trimmed };
		} catch (error: any) {
			throw new Error(
				`Failed to derive owner credential from address (${walletAddress}): ${error?.message || 'unknown error'}`,
			);
		}
	};

	const getContractAddr = async (): Promise<string> => {
		const owner = getOwnerCredential();

		const compiledCode = getCompiledCode();
		if (!compiledCode || typeof compiledCode !== 'string' || compiledCode.trim() === '') {
			throw new Error('Compiled code is missing or empty in blueprint');
		}

		const networkId = getNetworkId();
		const address = await getContractAddress(compiledCode, owner, networkId);

		if (!address || address.trim() === '') {
			throw new Error('Generated contract address is empty');
		}

		return address;
	};

	const sendToContract = async (amountLovelace: number, datum: WalletDatum) => {
		if (!wallet) {
			throw new Error('Wallet not connected');
		}

		try {
			setLoading(true);
			const contractAddress = await getContractAddr();
			const encodedDatum = encodeDatum(datum);
			const tx = new Transaction({ initiator: wallet });
			tx.sendLovelace(
				{
					address: contractAddress,
					datum: { value: encodedDatum, inline: true },
				},
				amountLovelace.toString(),
			);

			const unsignedTx = await tx.build();
			const signedTx = await wallet.signTx(unsignedTx);
			const txHash = await wallet.submitTx(signedTx);

			return txHash;
		} catch (error) {
			throw error;
		} finally {
			setLoading(false);
		}
	};

	const withdrawFromContract = async (utxo: any) => {
		if (!wallet) {
			throw new Error('Wallet not connected');
		}

		if (!walletAddress) {
			throw new Error('Wallet address not available');
		}

		try {
			setLoading(true);

			const owner = getOwnerCredential();
			await getContractAddr();
			const ownerForScript = getOwnerCredential();

			const compiledCode = getCompiledCode();
			const { applyParamsToScript } = await import('@meshsdk/core-csl');
			const { mConStr0, mConStr1 } = await import('@meshsdk/core');

			const ownerParam =
				ownerForScript.type === 'VerificationKey' ? mConStr0([ownerForScript.hash]) : mConStr1([ownerForScript.hash]);
			const parameterizedScript = applyParamsToScript(compiledCode, [ownerParam]);

			const redeemer = encodeRedeemer();
			const datumValue = utxo.output.plutusData;
			const datumConfig: any = datumValue;

			const walletUtxos = await wallet.getUtxos();

			const pureLovelaceUtxos =
				walletUtxos?.filter((wUtxo: any) => {
					const amounts = wUtxo.output?.amount || [];

					if (!Array.isArray(amounts) || amounts.length === 0) {
						return false;
					}

					const hasOnlyLovelace = amounts.length === 1 && amounts[0]?.unit === 'lovelace';
					const lovelaceAmount = amounts.find((a: any) => a.unit === 'lovelace')?.quantity || '0';
					const lovelaceBigInt = BigInt(lovelaceAmount);
					const minCollateral = BigInt(5000000);

					return hasOnlyLovelace && lovelaceBigInt >= minCollateral;
				}) || [];

			if (pureLovelaceUtxos.length === 0) {
				throw new Error(
					'No pure ADA UTxOs found for collateral. You need at least 5 ADA in a UTxO with no tokens to execute smart contract transactions. Please send some pure ADA to your wallet.',
				);
			}

			const tx = new Transaction({ initiator: wallet });

			tx.redeemValue({
				value: utxo,
				script: {
					code: parameterizedScript,
					version: 'V3',
				},
				redeemer: { data: redeemer },
			});

			const lovelaceAsset = utxo.output.amount.find((a: any) => a.unit === 'lovelace');
			if (lovelaceAsset) {
				tx.sendLovelace(walletAddress, lovelaceAsset.quantity);
			}

			const collateralUtxo = pureLovelaceUtxos[0];
			tx.setCollateral([collateralUtxo]);

			tx.setRequiredSigners([walletAddress]);

			const currentTime = Date.now();
			const validFromMs = currentTime - 60000;
			const validToMs = currentTime + 300000;

			const { resolveSlotNo } = await import('@meshsdk/core');
			const { getNetwork } = await import('@/config/provider');
			const network = getNetwork();
			const validFromSlot = resolveSlotNo(network, validFromMs);
			const validToSlot = resolveSlotNo(network, validToMs);

			(tx as any).txBuilder.invalidBefore(validFromSlot);
			(tx as any).txBuilder.invalidHereafter(validToSlot);

			const unsignedTx = await tx.build();

			let signedTx;
			try {
				signedTx = await wallet.signTx(unsignedTx, false);
			} catch (signError: any) {
				signedTx = await wallet.signTx(unsignedTx, true);
			}

			let txHash;
			try {
				txHash = await wallet.submitTx(signedTx);
			} catch (submitError: any) {
				throw submitError;
			}

			const explorerUrl =
				network === 'mainnet'
					? `https://cardanoscan.io/transaction/${txHash}`
					: `https://${network}.cardanoscan.io/transaction/${txHash}`;
			console.log('Transaction submitted:', explorerUrl);

			return txHash;
		} catch (error: any) {
			if (error?.message?.includes('collateral') || error?.message?.includes('No pure lovelace')) {
				throw new Error(
					'Collateral required: You need at least 5 ADA in a UTxO with no tokens to execute smart contract transactions. Please send some pure ADA to your wallet and try again.',
				);
			}

			throw error;
		} finally {
			setLoading(false);
		}
	};

	const fetchContractUTxOs = async () => {
		try {
			const contractAddress = await getContractAddr();

			if (!contractAddress || contractAddress.trim() === '') {
				setContractUTxOs([]);
				return [];
			}

			if (!contractAddress.startsWith('addr')) {
				setContractUTxOs([]);
				return [];
			}

			const provider = getProvider();
			const utxos = await provider.fetchAddressUTxOs(contractAddress);

			const parsedUTxOs = utxos.map((utxo) => {
				let plutusData = utxo.output.plutusData;
				if (typeof plutusData === 'string') {
					try {
						plutusData = deserializeCborDatum(plutusData);
					} catch (error) {
						plutusData = undefined;
					}
				}

				const datumValue = decodeDatum(plutusData as any);

				return {
					...utxo,
					datumValue,
				};
			});

			setContractUTxOs(parsedUTxOs);
			return parsedUTxOs;
		} catch (error) {
			return [];
		}
	};

	return {
		loading,
		contractUTxOs,
		getContractAddress: getContractAddr,
		sendToContract,
		withdrawFromContract,
		fetchContractUTxOs,
	};
}
