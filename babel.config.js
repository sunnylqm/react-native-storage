const env = process.env.NODE_ENV;

const isEnvProduction = env === 'production';

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      isEnvProduction
        ? {
            targets: {
              ie: 9
            },
            modules: false
          }
        : {
            targets: {
              node: 'current'
            }
          }
    ]
  ],
  plugins: [
    [
      '@babel/plugin-proposal-object-rest-spread',
      {
        useBuiltIns: true
      }
    ]
  ]
};
