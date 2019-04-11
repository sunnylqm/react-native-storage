import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import { terser } from 'rollup-plugin-terser';

const env = process.env.NODE_ENV;
const config = {
  input: './src/storage.js',
  output: [
    {
      exports: 'named',
      file: 'lib/storage.umd.js',
      format: 'umd',
      sourcemap: true,
      name: 'storage',
    },
    {
      exports: 'named',
      file: 'lib/storage.cjs.js',
      sourcemap: true,
      format: 'cjs',
    },
    {
      file: 'lib/storage.esm.js',
      sourcemap: true,
      format: 'esm',
    },
  ],
  plugins: [
    resolve(),
    babel({
      exclude: 'node_modules/**',
    }),
    terser(),
  ],
};

export default config;
