const fs = require("fs");
const validate = require("schema-utils").validate;
const omit = require("./util").omit;
const chokidar = require("chokidar");
const esbuild = require("esbuild");
const schema = require("./schema.json");

const PLUGIN_NAME = "WebpackPrebuildPlugin";
const getExternalKey = (key) =>
  `__WEBPACK_PREBUNDLE_GLOBAL_${key.toUpperCase().replace(/[^a-zA-Z ]/g, "")}`;

let vendorsInitialBuildFinished = false;
let commonsInitialBuildFinished = false;

class WebpackPrebundlePlugin {
  constructor(options) {
    validate(schema, options, { name: PLUGIN_NAME });
    this.options = options;
  }

  apply(compiler) {
    let buildVendors = null;
    let buildCommons = null;
    if (this.options.vendors && this.options.vendors.entries) {
      const entries = this.options.vendors.entries;
      const externals = {};
      this.options.vendors.entries.forEach((key) => {
        externals[key] = getExternalKey(key);
      });
      compiler.options.externals = {
        ...compiler.options.externals,
        ...externals,
      };

      if (this.options.vendors.output) {
        const output = this.options.vendors.output;
        let entryFile =
          "const wrapper = (m) => { if (m.default) { m.__esModule = true} return m }\n";

        entries.forEach((key) => {
          entryFile =
            entryFile + `import * as ${externals[key]} from '${key}'\n`;
        });

        entries.forEach((key) => {
          entryFile =
            entryFile + `window.${externals[key]}=wrapper(${externals[key]})\n`;
        });

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
                global: "window",
                __dirname: `'${__dirname}'`,
                "process.platform": `${process.platform}`,
                ...customOptions.define,
              },
              sourcemap: true,
              outfile: output,
              ...omit(customOptions, [
                "external",
                "outfile",
                "define",
                "bundle",
                "entryPoints",
              ]),
            })
            .then(() => {
              console.log("[WebpackPrebundlePlugin] Vendor prebunding success");
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
          entryPoints: item.entries,
          logLevel: "error",
          outfile: item.output,
          ...omit(item.esbuildOptions || {}, ["outfile", "entryPoints"]),
        };
      };
      const watch = () => {
        commons.forEach((item) => {
          if (item.watch) {
            item.entries.forEach((src) => {
              const watchTargets = Array.isArray(item.watch) ? item.watch : src;
              chokidar
                .watch(watchTargets, { ignoreInitial: true })
                .on("all", (event, path) => {
                  console.log(
                    `[WebpackPrebundlePlugin] ${path} ${event}, rebuild common code`
                  );
                  esbuild.build(getBuildOptions(item)).catch((e) => {
                    console.error(
                      `[WebpackPrebundlePlugin] Error: ${e.message}`
                    );
                  });
                });
            });
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
          console.log(
            `[WebpackPrebundlePlugin] Common code prebunding success`
          );
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
}

module.exports = WebpackPrebundlePlugin;
