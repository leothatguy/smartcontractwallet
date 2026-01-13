import { mConStr0, mConStr1, serializePlutusScript } from '@meshsdk/core';
import type { WalletDatum, OwnerCredential } from './types';

let applyParamsToScript: any = null;
let cslLoadPromise: Promise<any> | null = null;

const loadCSL = async () => {
	if (applyParamsToScript) {
		return applyParamsToScript;
	}

	if (typeof window === 'undefined') {
		return null;
	}

	if (cslLoadPromise) {
		await cslLoadPromise;
		return applyParamsToScript;
	}

	cslLoadPromise = (async () => {
		try {
			const csl = await import('@meshsdk/core-csl');
			applyParamsToScript = csl.applyParamsToScript;
			return applyParamsToScript;
		} catch {
			cslLoadPromise = null;
			return null;
		}
	})();

	return await cslLoadPromise;
};

export function encodeDatum(datum: WalletDatum) {
	if (datum === null) {
		return mConStr1([]);
	} else {
		const posixSeconds = Math.floor(datum / 1000);
		return mConStr0([posixSeconds]);
	}
}

export function encodeRedeemer() {
	return mConStr0([]);
}

export function createNoLockDatum() {
	return encodeDatum(null);
}

export function createTimeLockDatum(lockUntilDate: Date) {
	return encodeDatum(lockUntilDate.getTime());
}

export function createTimeLockInMinutes(minutes: number) {
	const lockTime = Date.now() + minutes * 60 * 1000;
	return encodeDatum(lockTime);
}

export async function getContractAddress(
	compiledCode: string,
	owner: OwnerCredential,
	networkId: 0 | 1 = 0,
): Promise<string> {
	if (typeof window === 'undefined') {
		throw new Error('getContractAddress must be called on the client side');
	}

	const ownerParam = owner.type === 'VerificationKey' ? mConStr0([owner.hash]) : mConStr1([owner.hash]);

	let retries = 3;
	let applyParams: any = null;

	while (retries > 0 && !applyParams) {
		applyParams = await loadCSL();
		if (!applyParams && retries > 1) {
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
		retries--;
	}

	if (!applyParams) {
		throw new Error(
			'Failed to load applyParamsToScript. The CSL WASM module may not be loaded. Please refresh the page.',
		);
	}

	const scriptCbor = applyParams(compiledCode, [ownerParam]);

	const { address } = serializePlutusScript(
		{
			code: scriptCbor,
			version: 'V3',
		},
		networkId,
	);

	return address;
}

export function decodeDatum(datum: any): WalletDatum {
	if (!datum || typeof datum !== 'object') {
		return null;
	}

	const constructor = typeof datum.constructor === 'bigint' ? Number(datum.constructor) : datum.constructor;

	if (constructor === 0 && Array.isArray(datum.fields) && datum.fields.length > 0) {
		const field = datum.fields[0];
		let posixSeconds: number;

		if (typeof field === 'object' && field !== null && 'int' in field) {
			const intValue = field.int;
			posixSeconds = typeof intValue === 'bigint' ? Number(intValue) : parseInt(intValue, 10);
		} else {
			posixSeconds = parseInt(field, 10);
		}

		return posixSeconds * 1000;
	}

	return null;
}
