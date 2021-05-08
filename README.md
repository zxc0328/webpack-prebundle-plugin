## Webpack-prebundle-plugin

![](https://img.shields.io/npm/v/webpack-prebundle-plugin)

### Introduction

Webpack-prebundle-plugin is a Webpack plugin for fast prebundling with [esbuild](https://esbuild.github.io). Prebunding vendors and common code can lower the number of modules Webpack need to build and boost build speed.

Webpack-prebundle-plugin use [external](https://webpack.js.org/configuration/externals/) internally and is a more simple and fast replacement for [DLLPlugin](https://webpack.js.org/plugins/dll-plugin/). ESbuild can bundle thousands of modules in a few seconds so you don't need to build the DLL bundle in advance(Or commit the bundle in Git repo). The plugin prebundles right before the Webpack build start. Brings seamlessly developer experience.


### Usage

The usage is three simple steps:

**Step1: Install package:**

```bash
yarn add webpack-prebundle-plugin
```

**Step2: Init plugin in Webpack config:**

```js
const webpackPrebundlePlugin = require("webpack-prebundle-plugin")
const path = require("path")

module.exports = {
    plugins: [
        new webpackPrebundlePlugin({
            vendors: {
                entries: ['react', 'react-dom', 'antd'],
                output: path.resolve(__dirname, "../public/vendors.js")
            },
        })
    ]
}
```

**Step3: Add vendors script tag in HTML（public/index.html in CRA template for example）:**

```html
<head>
  <title>React App</title>
  <script src="%PUBLIC_URL%/vendors.js"></script>
</head>
```

Then you are done! Enjoy the build performance boost.


### Config

####  vendors

```javascript
{
  vendors: {
    entries: ['react', 'react-dom', 'antd'], // vendors entries,  similar to entries in webpack 
    output: path.resolve(__dirname, "../public/vendors.js") // output file's path
    esbuildOptions: {
        // extra esbuildOptions, doc: https://esbuild.github.io/api/#simple-options
    }
  },
}
```


####  commons

// todo


View complete option schema in [Schema.json](https://github.com/zxc0328/webpack-prebuild-plugin/blob/master/lib/schema.json)

### Why build this plugin?

Webpack runs faster when it builds less modules. We can make Webpack build faster by reduce the number of modules, like externalize all dependencies from node_modules or prebundle vendors code with DLLPLugin. But both external and DLLPlugin have some inconvenience. External requires modify HTML template when upgrade dependency version. DLLPlugin need rebuild every time when upgrade dependency version and we need to store JS files built within Git repo(commit changes for dll bundle every time when deps change).

DLLPlugin is better for large-scale Web apps that use hundreds of deps. Not all deps are UMD bundled and can be externalized. So DLLPlugin is kind of a universal solution. The way DLLPlugin works, is bundling less frequently changed code ahead of time. That's what prebundle means. DLLPlugin works fine, but it has the defect metioned above.

As the raise of front-end tooling written with compile-to-native language. We can integrate tool like esbuild with Webpack for pre-bundling. ESbuild bundle is so fast that we can build vendors on the fly right before webpack build starts.

This plugin integrate esbuild into Webpack compile flow, and allow user to pre-bundle two categories of files.

**1. vendors**

Files in node_modules are basicly immutable. So we assume these files will not change during the build. Pre-bunding vendors code will drastically improve build speed becase the number of files in node_modules in huge.


**2. commons**

We may have some auto-generated files in project, like [Pont](https://github.com/alibaba/pont) code(api request code generated from swagger api definition). Or we may have large amount of common util code like i18n. These files will not change that frequently.

We can pre-bundle commons codes as well, and webpack-prebundle-plugin provide watch mode for common code. common bundle will be rebuild when watch path has file change event.

### Use in production

This plugin use Webpack [external](https://webpack.js.org/configuration/externals/) internally, so theoretically it will work fine in production. You need to [define](https://esbuild.github.io/api/#define) `process.env.NODE_ENV` with `'"production"'`in `vendors.esbuildOptions.define` to get minified prod version of your deps. Example:

```javascript
{
    vendors: {
        esbuildOptions: {
            define: "process.env.NODE_ENV": '"production"',
        }
    }
}                
```

### Caveats


Since esbuild support ES module standard in a more strict way, unlike Webpack, which has build-in polyfill for nodejs core modules(Webpack 4) and backward compatible with many historical design. Some module may have issue built with esbuild but works fine under Webpack. The issue varies. To solve this, get to know why that module is not a standard es module, and search for esbuild doc and github issue for help.

You can tweak [esbuild options](https://esbuild.github.io/api/#bundle) in `vendors.esbuildOptions` and `commons.esbuildOptions`.

Or you can use DLLPlugin with Webpack-prebundle-plugin all together. Let DLLPlugin deal with module that has es module compatibility issue.