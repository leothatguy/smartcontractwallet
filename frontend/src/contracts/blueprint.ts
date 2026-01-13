import blueprint from './plutus.json';

export function getSmartWalletValidator() {
	const validator = blueprint.validators.find((v) => v.title === 'smart_wallet.smart_wallet.spend');

	if (!validator) {
		throw new Error('Smart wallet validator not found in blueprint');
	}

	return validator;
}


export function getValidatorHash(): string {
	return getSmartWalletValidator().hash;
}

export function getCompiledCode(): string {
	return getSmartWalletValidator().compiledCode;
}
