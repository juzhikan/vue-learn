
var path = require('path')

module.exports = function(env, argv) {
  var config = {
    mode: env.production ? 'production' : 'development',
    devServer: {
      disableHostCheck: true,
      historyApiFallback: true,
      open: true
    },
    module: {
      rules: [
        { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" }
      ]
    }
  }

  if (!env.production) config.devtool = 'cheap-module-eval-source-map'

  return config
}