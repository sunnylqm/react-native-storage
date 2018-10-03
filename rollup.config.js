import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import replace from 'rollup-plugin-replace';
import { terser } from 'rollup-plugin-terser';

const env = process.env.NODE_ENV;
const config = {
  input: './src/storage.js',
  output: [
    {
      exports: 'named',
      file: 'lib/storage.umd.js',
      format: 'umd',
      name: 'storage',
    },
    {
      exports: 'named',
      file: 'lib/storage.cjs.js',
      format: 'cjs',
    },
    {
      file: 'lib/storage.esm.js',
      format: 'esm',
    }
  ],
  plugins: [
    resolve(),
    babel({
      exclude: 'node_modules/**',
      plugins: ['@babel/external-helpers'],
      externalHelpers: true
    }),
    replace({
      'process.env.NODE_ENV': JSON.stringify(env)
    })
  ],
};

if (env === 'production') {
  config.plugins.push(terser());
}

export default config;
