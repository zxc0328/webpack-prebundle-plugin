const util = require("../lib/util");

test("should generate entry code", () => {
  const entries = ["react", "react-dom", "@alipay/foo"];
  const external = util.getExternalConfig(entries);
  expect(util.generateEntryJS(entries, external)).toMatchSnapshot();
});
