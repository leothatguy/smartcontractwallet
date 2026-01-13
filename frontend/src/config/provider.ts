import { BlockfrostProvider } from '@meshsdk/core';

export function getProvider(): BlockfrostProvider {
	const apiKey = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY;

	if (!apiKey) {
		throw new Error('NEXT_PUBLIC_BLOCKFROST_API_KEY is not set. ' + 'Get a free API key at https://blockfrost.io');
	}

	return new BlockfrostProvider(apiKey);
}

export function getNetworkId(): 0 | 1 {
	const network = process.env.NEXT_PUBLIC_NETWORK || 'preview';
	return network === 'mainnet' ? 1 : 0;
}

export function getNetwork(): 'mainnet' | 'preview' | 'preprod' {
	return (process.env.NEXT_PUBLIC_NETWORK || 'preview') as 'mainnet' | 'preview' | 'preprod';
}
