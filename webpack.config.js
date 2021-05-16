//@ts-check
const path = require('path');

module.exports = [
	{
		mode: 'none',
		entry: './src/index.ts',

		resolve: {
			mainFields: ['module', 'main'],
			extensions: ['.ts', '.js'],
		},

		output: {
			library: {
				name: 'Tracery',
				type: 'umd',
			},
			globalObject: 'this',
			path: path.resolve(__dirname, 'lib', 'umd'),
			filename: 'index.js',
		},

		module: {
			rules: [
				{
					test: /\.ts$/,
					exclude: [/node_modules/],
					use: [
						{
							loader: 'ts-loader',
							options: {
								compilerOptions: {
									sourceMap: true,
								},
							},
						},
					],
				},
			],
		},

		devtool: 'source-map',
	},
	{
		mode: 'none',
		entry: './src/index.ts',

		resolve: {
			mainFields: ['module', 'main'],
			extensions: ['.ts', '.js'],
		},

		output: {
			library: {
				name: 'LIB',
				type: 'var',
			},
			path: path.resolve(__dirname, 'lib', 'esm'),
			filename: 'index.js',
		},

		module: {
			rules: [
				{
					test: /\.ts$/,
					exclude: /node_modules/,
					use: [
						{
							// configure TypeScript loader:
							// * enable sources maps for end-to-end source maps
							loader: 'ts-loader',
							options: {
								compilerOptions: {
									sourceMap: true,
									module: 'es6',
								},
							},
						},
					],
				},
			],
		},

		devtool: 'source-map',
		plugins: [
			// webpack 5 can not generate ESM modules yet: https://github.com/webpack/webpack/issues/2933
			// manually add the exports as footer
			{
				apply: (compiler) => {
					const esmExports = `export const Tracery = LIB;`;
					compiler.hooks.thisCompilation.tap(
						'AddESMExports',
						(compilation) => {
							compilation.hooks.processAssets.tap(
								{
									name: 'AddESMExports',
									stage: compiler.webpack.Compilation
										.PROCESS_ASSETS_STAGE_ADDITIONS,
								},
								(chunks) => {
									Object.keys(chunks).forEach((fileName) => {
										compilation.updateAsset(
											fileName,
											(content) =>
												new compiler.webpack.sources.ConcatSource(
													content,
													'\n',
													esmExports
												)
										);
									});
								}
							);
						}
					);
				},
			},
		],
	},
];
