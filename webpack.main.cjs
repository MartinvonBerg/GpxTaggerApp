// webpack.main.cjs
const path = require('path');

module.exports = {
  mode: 'production',
  target: 'electron-main',
  entry: {
    main: './main.mjs',
  },
  output: {
    filename: 'main.bundle.cjs',
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
