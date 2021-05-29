const WebpackPrebundlePlugin = require("../lib/index");
const path = require("path");
const fs = require("fs");
const { AsyncSeriesHook } = require("tapable");
const chokidar = require("chokidar");

test("should generate vendor js", (done) => {
  const outputPath = path.resolve(__dirname, "./.output/vendors.js");
  const plugin = new WebpackPrebundlePlugin({
    vendors: {
      entries: [
        path.resolve(__dirname, "./entries/mock.a.js"),
        path.resolve(__dirname, "./entries/mock.b.js"),
      ],
      output: path.resolve(__dirname, "./.output/vendors.js"),
    },
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
    const content = String(fs.readFileSync(outputPath, { encode: "utf8" }));
    expect(content).toMatchSnapshot();
    done();
  });
});

test("should generate common js", (done) => {
  const outputPath = path.resolve(__dirname, "./.output/commons.js");
  const plugin = new WebpackPrebundlePlugin({
    commons: [
      {
        entry: path.resolve(__dirname, "./entries/mock.a.js"),
        output: outputPath,
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
    const content = String(fs.readFileSync(outputPath, { encode: "utf8" }));
    expect(content).toMatchSnapshot();
    done();
  });
});