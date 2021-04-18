## Webpack-prebundle-plugin

// todo: intro

### Usage

Install package:

```bash
yarn add webpack-prebundle-plugin
```

Init plugin in Webpack config:

```js
const webpackPrebundlePlugin = require("webpack-prebundle-plugin")
const path = require("path")

module.exports = {
    plugins: [
        new webpackPrebundlePlugin({
            vendors: {
                entries: ['react', 'react-dom', 'antd'],
                output: path.resolve(__dirname, "./build/vendors.js")
            },
        })
    ]
}
```


### Config


// todo: config doc
