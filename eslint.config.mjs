import next from "eslint-config-next";

export default [
  ...next,
  {
    ignores: [
      "test/BagFiZapper.test.js",
      "test/SmartBagVault.test.cjs",
      ".next/",
      "dist/",
      "node_modules/",
      "artifacts/",
      "cache/",
      "*.generated.ts",
      "*.generated.js"
    ]
  }
];
