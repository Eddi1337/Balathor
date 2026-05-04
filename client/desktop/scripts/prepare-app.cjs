const fs = require("node:fs");
const path = require("node:path");

const desktopRoot = path.resolve(__dirname, "..");
const clientRoot = path.resolve(desktopRoot, "..");
const appRoot = path.join(desktopRoot, "app");

fs.rmSync(appRoot, { recursive: true, force: true });
fs.mkdirSync(path.join(appRoot, "src"), { recursive: true });

for (const file of ["index.html", "styles.css", "config.local.json"]) {
  fs.copyFileSync(path.join(clientRoot, file), path.join(appRoot, file));
}

fs.cpSync(path.join(clientRoot, "src"), path.join(appRoot, "src"), {
  recursive: true
});

console.log(`Prepared desktop client assets in ${path.relative(process.cwd(), appRoot)}`);
