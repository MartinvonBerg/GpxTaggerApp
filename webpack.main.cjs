// webpack.main.cjs to bundle main.mjs
const path = require('path');

module.exports = {
  //mode: 'production',
  target: 'electron-main',
  devtool: 'source-map',
  entry: {
    main: './main.mjs',
  },
  output: {
    clean: true,
    filename: 'main.bundle.cjs',
    devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    path: path.resolve(__dirname, 'build'),
  },
  // möglichst wenige externals – alles, was hier nicht steht, landet im Bundle
  externals: {
    // electron selbst wird zur Laufzeit von Electron bereitgestellt
    electron: 'commonjs2 electron',
    // native / dynamische Module bleiben Runtime-Dependencies
    sharp: 'commonjs2 sharp',
    'exiftool-vendored': 'commonjs2 exiftool-vendored',
  },
  resolve: {
    extensions: ['.js', '.mjs'],
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: { loader: 'babel-loader' },
      },
    ],
  },
};
