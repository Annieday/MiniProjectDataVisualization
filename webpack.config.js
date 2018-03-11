var path = require('path');
var webpack = require('webpack');
var vtkRules = require('vtk.js/Utilities/config/dependency.js').webpack.v2.rules;

var entry = path.join(__dirname, './app/static/app/main.js');
const sourcePath = path.join(__dirname, './app/static/app/scripts');
const outputPath = path.join(__dirname, './app/static/app/scripts/build');

module.exports = {
  entry,
  output: {
    path: outputPath,
    filename: 'build.js',
  },
  module: {
    rules: [
        { test: entry, loader: "expose-loader?build" },
        { test: /\.html$/, loader: 'html-loader' },
    ].concat(vtkRules),
  },
  resolve: {
    modules: [
      path.resolve(__dirname, 'node_modules'),
      sourcePath,
    ],
  },
};