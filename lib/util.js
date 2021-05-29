const path = require("path");

const omit = (obj, keys) => {
  let newObj = {};
  Object.keys(obj)
    .filter((k) => !keys.includes(k))
    .forEach((k) => {
      newObj[k] = obj[k];
    });

  return newObj;
};

const getExternalKey = (key) =>
  `__WEBPACK_PREBUNDLE_GLOBAL_${key.toUpperCase().replace(/[^a-zA-Z ]/g, "")}`;

const getExternalConfig = (entries) => {
  const externals = {};
  entries.forEach((key) => {
    externals[key] = getExternalKey(key);
  });
  return externals;
};

const generateEntryJS = (entries, externals) => {
  let entryFile =
    "const wrapper = (m) => { if (m.default) { m.__esModule = true} return m }\n";

  entries.forEach((key) => {
    entryFile = entryFile + `import * as ${externals[key]} from '${key}'\n`;
  });

  entries.forEach((key) => {
    entryFile =
      entryFile + `window.${externals[key]}=wrapper(${externals[key]})\n`;
  });

  return entryFile;
};

module.exports = {
  omit,
  getExternalConfig,
  generateEntryJS,
};
