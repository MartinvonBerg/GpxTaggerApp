// webpack.config.js  
const path = require('path');  
  
module.exports = {  
  entry: './src/renderer-main.js',  
  output: {  
    filename: 'bundle.js',  
    path: path.resolve(__dirname, 'build'),  
  },  
  target: 'web',  
  module: {  
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource', // see: https://stackoverflow.com/questions/67186653/webpack-loads-wrong-images-to-dist-directory
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {  
        test: /\.js$/,  
        exclude: /node_modules/,  
        use: {  
          loader: 'babel-loader',  
        },  
      },  
    ],  
  },  
};  