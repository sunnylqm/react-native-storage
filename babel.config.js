const env = process.env.NODE_ENV;

const isEnvProduction = env === 'production';
const isEnvTest = env === 'test';


module.exports = {
  presets: [
    isEnvTest && [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        }
      }
    ],
    isEnvProduction && [
      '@babel/preset-env',
      {
        targets: {
          ie: 9,
        },
        modules: false,
      },
    ],
  ].filter(Boolean),
  plugins: [
    '@babel/plugin-transform-destructuring',
    [
      '@babel/plugin-proposal-object-rest-spread',
      {
        useBuiltIns: true,
      },
    ],
  ],
};
