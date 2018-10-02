import babel from 'rollup-plugin-babel';

export default {
  input: './src/storage.js',
  output: [
    {
      exports: 'named',
      file: 'dist/react-native-storage.js',
      format: 'umd',
      name: 'storage',
    },
    {
      exports: 'named',
      file: 'dist/react-native-storage.cjs.js',
      format: 'cjs',
    },
    {
      file: 'dist/react-native-storage.esm.js',
      format: 'esm',
    }
  ],
  plugins: [
    babel({
      exclude: 'node_modules/**',
    }),
  ],
}
