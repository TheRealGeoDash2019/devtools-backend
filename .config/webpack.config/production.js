import webpack from 'webpack'
import merge from 'webpack-merge'
import DuplicatePackageCheckerWebpackPlugin from 'duplicate-package-checker-webpack-plugin'
import TerserPlugin from 'terser-webpack-plugin'

import common from './common'

const config = {
    bail: true,
    //debug: false,
    profile: false,
    devtool: 'source-map',
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin({
            terserOptions: {
                compress: {
                    drop_console: true,
                    drop_debugger: true
                },
                output: {
                    comments: false
                }
            }
        })],
    },
    plugins: [
        new webpack.NoEmitOnErrorsPlugin(),
        new DuplicatePackageCheckerWebpackPlugin(),
    ],
    module: {
        rules: []
    }
}

export default merge(common, config)
