const WebpackPrebundlePlugin = require("../lib/index");
const path = require("path");
const fs = require("fs");
const { AsyncSeriesHook } = require("tapable");
const chokidar = require("chokidar");

test("should watch for common js when watch dir file change", (done) => {
  const outputPath = path.resolve(__dirname, "./.output/commonsC.js");
  const plugin = new WebpackPrebundlePlugin({
    commons: [
      {
        entry: path.resolve(__dirname, "./entries/mock.c.js"),
        output: outputPath,
        watch: [path.resolve(__dirname, "./entries/mock.c.js")],
      },
    ],
  });

  const mockCompilation = {
    options: {},
  };

  mockCompilation.hooks = {
    beforeRun: new AsyncSeriesHook(["compiler"]),
    watchRun: new AsyncSeriesHook(["compiler"]),
  };

  plugin.apply(mockCompilation);

  mockCompilation.hooks.beforeRun.callAsync({}, () => {
    let flag = false;
    setTimeout(() => {
      fs.writeFileSync(
        path.resolve(__dirname, "./entries/mock.c.js"),
        "console.log('modified mock c file content')"
      );
      flag = true;
    }, 200);

    const watcher = chokidar
      .watch(outputPath, {
        ignoreInitial: true,
      })
      .on("change", () => {
        if (flag) {
          const content = String(
            fs.readFileSync(outputPath, { encode: "utf8" })
          );
          expect(content).toMatchSnapshot();
          watcher.close().then(() => {
            plugin._reset(() => {
              fs.writeFileSync(
                path.resolve(__dirname, "./entries/mock.c.js"),
                "console.log('from mock c.js')"
              );
              done();
            });
          });
        }
      });
  });
});
