const packager = require("@electron/packager");
const path = require("node:path");

const desktopRoot = path.resolve(__dirname, "..");

packager({
  dir: desktopRoot,
  name: "Balathor",
  platform: "win32",
  arch: "x64",
  out: path.join(desktopRoot, "dist"),
  overwrite: true,
  asar: true,
  prune: false,
  ignore: [
    /^\/dist($|\/)/,
    /^\/node_modules($|\/)/,
    /^\/scripts($|\/)/,
    /^\/package-lock\.json$/,
    /^\/README\.md$/,
    /^\/\.npmrc$/
  ]
}).then((paths) => {
  for (const outputPath of paths) {
    console.log(`Packaged ${outputPath}`);
  }
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
