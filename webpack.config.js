const path              = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    //publicPath: '/',
    path: path.resolve(__dirname, 'dist')
  },
  resolve: {
    alias: {
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      title: 'Jayesstee Starter'
    })
  ],
  performance: {
    hints: false
  },
  devServer: {
    static: {
      directory: __dirname
    },
    // Display only errors to reduce the amount of output.
    //stats: "errors-only",

    // Parse host and port from env to allow customization.
    //
    // If you use Docker, Vagrant or Cloud9, set
    // host: options.host || "0.0.0.0";
    //
    // 0.0.0.0 is available to all network devices
    // unlike default `localhost`.
    host: '0.0.0.0',
    //disableHostCheck: true,
    port: process.env.PORT, // Defaults to 8080
    open: false, // Open the page in browser
    //overlay: true,
  },
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [{
          loader: 'file-loader',
          options: {
            limit: 1000,
            name : 'assets/[name].[ext]'
          }
        }]
      },
      {
        test: /.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
        use: [{
          loader: 'file-loader',
          options: {
            name: '[name].[ext]',
            outputPath: 'fonts/',    // where the fonts will go
            publicPath: 'dist/fonts'       // override the default path
          }
        }]
      },
    ]
  }
};
