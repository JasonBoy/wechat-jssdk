const path = require('path');
const webpack = require('webpack');

const PROD_MODE = process.env.NODE_ENV === 'production';


const config = {
  entry: path.resolve(__dirname, 'lib/client.js'),
  output: {
    path: path.resolve(__dirname, 'dist/'),
    filename: 'client.min.js',
    library: 'WechatJSSDK',
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: [
          path.resolve(__dirname, 'lib'),
        ],
        loader: 'babel-loader',
        options: {
          presets: ['es2015'],
        }
      }
    ]
  },
  plugins: [],
  devtool: 'source-map',
};

if(PROD_MODE) {
  const plugins = config.plugins;
  plugins.push(new webpack.DefinePlugin({
    'process.env': {
      'NODE_ENV': JSON.stringify('production')
    }
  }));
  plugins.push(new webpack.optimize.UglifyJsPlugin({
    compress:{
      warnings: true,
    },
  }))
}


module.exports = config;