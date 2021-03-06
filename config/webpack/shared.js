// Note: You must restart bin/webpack-dev-server for changes to take effect

/* eslint global-require: 0 */
/* eslint import/no-dynamic-require: 0 */

const webpack = require('webpack')
const merge = require('webpack-merge')
const { basename, dirname, join, relative, resolve } = require('path')
const { sync } = require('glob')
const ManifestPlugin = require('webpack-manifest-plugin')
const extname = require('path-complete-extname')
const { env, settings, output, engines } = require('./configuration.js')
const loaders = require('./loaders.js')

const extensionGlob = `**/*{${settings.extensions.join(',')}}*` // */
const entryPath = join(settings.source_path, settings.source_entry_path)

let packPaths = {}

Object.keys(engines).forEach(function(k) {
  let root = engines[k]
  let glob = join(root, entryPath, extensionGlob)
  packPaths[k] = sync(glob)
})

module.exports = {
  entry: Object.keys(packPaths).reduce(
    (map, pluginName) => {
      packPaths[pluginName].forEach(function(entry) {
        map[join(pluginName, basename(entry, extname(entry)))] = resolve(entry)
      })
      return map
    }, {}
  ),

  output: {
    filename: '[name].js',
    path: output.path,
    publicPath: output.publicPath
  },

  module: {
    rules: loaders,
  },

  plugins: [
    new webpack.EnvironmentPlugin(JSON.parse(JSON.stringify(env))),

    // Workaround for graphql/graphql-language-service#128
    new webpack.ContextReplacementPlugin(
      /graphql-language-service-interface[\\\/]dist$/,
      /\.js$/
    ),

    new ManifestPlugin({
      publicPath: output.publicPath,
      writeToFileEmit: true,
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      minChunks: module => /node_modules/.test(module.resource),
    }),
  ],

  resolve: {
    extensions: settings.extensions,
    modules: [resolve(settings.source_path)].concat(
      Object.keys(engines).map(key => engines[key]).map(engine => `${engine}/node_modules`)
    ),
  },

  resolveLoader: {
    modules: ['node_modules']
  }
}
