var path = require('path');
var webpack = require('webpack');
var vtkRules = require('vtk.js/Utilities/config/dependency.js').webpack.v2.rules;

var entry = path.join(__dirname, './app/static/app/main.js');
const sourcePath = path.join(__dirname, './app/static/app/scripts');
const outputPath = path.join(__dirname, './app/static/app/scripts/build');
const autoprefixer = require('autoprefixer');

module.exports = {
  entry,
  output: {
    path: outputPath,
    filename: 'build.js',
  },
  module: {
    rules: [
        { test: entry, loader: "expose-loader?build" },
        {
          test: /\.js$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: ['env'],
                // presets: [['env', { targets: { browsers: 'last 2 versions' } }]],
              },
            },
          ],
        },
        { test: /\.(png|jpg)$/, use: 'url-loader?limit=81920' },

        { test: /\.html$/, loader: 'html-loader' },
        {
          test: /\.mcss$/,
          use: [
            { loader: 'style-loader' },
            {
              loader: 'css-loader',
              options: {
                localIdentName: '[name]-[local]_[sha512:hash:base32:5]',
                modules: true,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                plugins: () => [autoprefixer('last 2 version', 'ie >= 10')],
              },
            },
          ],
        },
        {
          test: /\.svg$/,
          use: [{ loader: 'raw-loader' }],
        },
        {
          test: /\.worker\.js$/,
          use: [
            { loader: 'worker-loader', options: { inline: true, fallback: false } },
          ],
        },
    ].concat(vtkRules),
  },
  resolve: {
    modules: [
      path.resolve(__dirname, 'node_modules'),
      sourcePath,
    ],
  },
};
