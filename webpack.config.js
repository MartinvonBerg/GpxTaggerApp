// webpack.config.js
const path = require('path');

// Gemeinsame Regeln für JS/CSS/Assets
const commonRules = [
  {
    test: /\.css$/i,
    use: ['style-loader', 'css-loader'],
  },
  {
    test: /\.(png|svg|jpg|jpeg|gif)$/i,
    type: 'asset/resource',
  },
  {
    test: /\.tsx?$/,
    use: 'ts-loader',
    exclude: /node_modules/,
  },
  {
    test: /\.m?js$/,
    exclude: /node_modules/,
    use: {
      loader: 'babel-loader',
    },
  },
];

// 1) Renderer-Bundle: läuft im Browser-Kontext
const rendererConfig = {
  entry: {
    renderer: './src/renderer-main.js',
  },
  output: {
    filename: '[name].bundle.js', // renderer.bundle.js
    path: path.resolve(__dirname, 'build'),
  },
  target: 'web',
  //externals: {
  //  sharp: 'commonjs sharp',
  //},
  resolve: {
    extensions: ['.js', '.mjs'],
  },
  module: {
    rules: commonRules,
  },
};

// 2) Preload-Bundle: läuft im Electron-Preload-Kontext (Node + electron)
const preloadConfig = {
  entry: {
    preload: './src/preload.mjs',
  },
  output: {
    filename: '[name].bundle.js', // preload.bundle.js
    path: path.resolve(__dirname, 'build'),
  },
  target: 'electron-preload',
  externals: {
    // nicht in das Bundle packen, sondern zur Laufzeit von Electron bereitstellen
    electron: 'commonjs2 electron',
  },
  resolve: {
    extensions: ['.js', '.mjs'],
  },
  module: {
    rules: commonRules,
  },
};

module.exports = [rendererConfig, preloadConfig];
