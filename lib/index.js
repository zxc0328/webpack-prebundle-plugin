const fs = require("fs");
const path = require("path");
const validate = require("schema-utils").validate;
const util = require("./util");
const chokidar = require("chokidar");
const esbuild = require("esbuild");
const schema = require("./schema.json");

const PLUGIN_NAME = "WebpackPrebuildPlugin";

const defaultOptions = {
  logging: true,
};

let vendorsInitialBuildFinished = false;
let commonsInitialBuildFinished = false;

class WebpackPrebundlePlugin {
  constructor(options) {
    validate(schema, options, { name: PLUGIN_NAME });
    this.options = { ...defaultOptions, ...options };
    this.watchers = [];
    this.logging = this.options.logging;
  }

  apply(compiler) {
    let buildVendors = null;
    let buildCommons = null;
    if (this.options.vendors && this.options.vendors.entries) {
      const entries = this.options.vendors.entries;
      const externals = util.getExternalConfig(entries);
      compiler.options.externals = {
        ...compiler.options.externals,
        ...externals,
      };

      if (this.options.vendors.output) {
        const output = this.options.vendors.output;

        const entryFile = util.generateEntryJS(entries, externals);
        const entryDir = `${__dirname}/.prebundle`;
        const entryPath = `${entryDir}/entry.js`;

        if (!fs.existsSync(entryDir)) {
          fs.mkdirSync(entryDir);
        }

        fs.writeFileSync(entryPath, entryFile);

        const customOptions = this.options.vendors.esbuildOptions || {};

        buildVendors = () => {
          if (vendorsInitialBuildFinished) {
            return Promise.resolve();
          }
          return esbuild
            .build({
              entryPoints: [entryPath],
              bundle: true,
              logLevel: "error",
              define: {
                "process.env.NODE_ENV": '"development"',
                ...customOptions.define,
              },
              sourcemap: true,
              outfile: output,
              ...util.omit(customOptions, [
                "outfile",
                "define",
                "bundle",
                "entryPoints",
              ]),
            })
            .then(() => {
              if (this.logging) {
                console.log(
                  "[WebpackPrebundlePlugin] Vendor prebunding success"
                );
              }
              vendorsInitialBuildFinished = true;
              return Promise.resolve();
            });
        };
      }
    }

    if (this.options.commons) {
      const commons = this.options.commons;

      const getBuildOptions = (item) => {
        return {
          format: "esm",
          sourcemap: true,
          bundle: true,
          entryPoints: [item.entry],
          logLevel: "error",
          outfile: item.output,
          ...util.omit(item.esbuildOptions || {}, ["outfile", "entryPoints"]),
        };
      };
      const watch = () => {
        commons.forEach((item) => {
          if (item.watch) {
            const src = item.entry;
            const watchTargets = Array.isArray(item.watch) ? item.watch : src;
            const watcher = chokidar
              .watch(watchTargets, { ignoreInitial: true })
              .on("all", (event, path) => {
                if (this.logging) {
                  console.log(
                    `[WebpackPrebundlePlugin] ${path} ${event}, rebuild common code`
                  );
                }
                esbuild.build(getBuildOptions(item)).catch((e) => {
                  console.error(`[WebpackPrebundlePlugin] Error: ${e.message}`);
                });
              });
            this.watchers.push(watcher);
          }
        });
      };

      buildCommons = () => {
        if (commonsInitialBuildFinished) {
          return Promise.resolve();
        }

        return Promise.all(
          commons.map((item) => {
            return esbuild.build(getBuildOptions(item));
          })
        ).then(() => {
          if (this.logging) {
            console.log(
              `[WebpackPrebundlePlugin] Common code prebunding success`
            );
          }
          commonsInitialBuildFinished = true;
          watch();
          return Promise.resolve();
        });
      };
    }

    const handleHook = (callback) => {
      let buildQueue = [];
      if (buildVendors) {
        buildQueue.push(buildVendors());
      }
      if (buildCommons) {
        buildQueue.push(buildCommons());
      }
      Promise.all(buildQueue)
        .then(() => {
          callback();
        })
        .catch((e) => {
          console.error(`[WebpackPrebundlePlugin] Error: ${e.message}`);
          vendorsInitialBuildFinished = true;
          commonsInitialBuildFinished = true;
          callback();
        });
    };

    compiler.hooks.watchRun.tapAsync(PLUGIN_NAME, (params, callback) => {
      handleHook(callback);
    });

    compiler.hooks.beforeRun.tapAsync(PLUGIN_NAME, (params, callback) => {
      handleHook(callback);
    });
  }

  // clean up watcher, method for test
  async _reset(done) {
    await Promise.all(this.watchers.map((w) => w.close()));
    done();
  }
}

module.exports = WebpackPrebundlePlugin;
