import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import replace from 'rollup-plugin-replace';
import { terser } from 'rollup-plugin-terser';

const env = process.env.NODE_ENV;
const config = {
  input: 'src/storage.js',
  output: {
    file: 'lib/storage.js',
    format: 'cjs'
  },
  plugins: [
    resolve(),
    babel({
      exclude: 'node_modules/**',
      plugins: ['external-helpers'],
      externalHelpers: true
    }),
    replace({
      'process.env.NODE_ENV': JSON.stringify(env)
    })
  ]
};

if (env === 'production') {
  config.plugins.push(terser());
}

export default config;
