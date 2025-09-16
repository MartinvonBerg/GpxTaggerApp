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
        test: /\.js$/,  
        exclude: /node_modules/,  
        use: {  
          loader: 'babel-loader',  
        },  
      },  
    ],  
  },  
};  