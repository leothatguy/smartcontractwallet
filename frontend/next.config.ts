import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	reactCompiler: true,
	turbopack: {},
	webpack: (config, { isServer }) => {
		config.experiments = {
			...config.experiments,
			asyncWebAssembly: true,
		};

		config.resolve.fallback = {
			...config.resolve.fallback,
			fs: false,
		};

		if (!isServer) {
			config.output.environment = {
				...config.output.environment,
				asyncFunction: true,
			};
		}

		return config;
	},
};

export default nextConfig;
