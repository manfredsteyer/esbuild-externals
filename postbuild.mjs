import * as esbuild from "esbuild";
import * as path from "path";
import * as url from "url";
import * as fs from "fs";

import { createCompilerPlugin } from "@angular-devkit/build-angular/src/tools/esbuild/angular/compiler-plugin.js";
import { createCompilerPluginOptions } from "@angular-devkit/build-angular/src/tools/esbuild/compiler-plugin-options.js";

import { createSharedMappingsPlugin } from "./shared-mappings-plugin.mjs";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

function toBundleName(packageName) {
  return packageName.replace(/[^A-Za-z0-9]/g, "_");
}

// Own Config

const dev = false;
const hash = false;
const outDir = "dist/demo";

const shareConfig = [
  {
    entryPoint:
      "node_modules/@angular/platform-browser/fesm2022/platform-browser.mjs",
    packageName: "@angular/platform-browser",
  },
  {
    entryPoint: "node_modules/@angular/core/fesm2022/core.mjs",
    packageName: "@angular/core",
  },
  {
    entryPoint: "node_modules/@angular/common/fesm2022/common.mjs",
    packageName: "@angular/common",
  },
  {
    entryPoint: "node_modules/@angular/common/fesm2022/http.mjs",
    packageName: "@angular/common/http",
  },
  {
    entryPoint: "node_modules/rxjs/dist/esm/index.js",
    packageName: "rxjs",
  },
  {
    entryPoint: "node_modules/rxjs/dist/esm/operators/index.js",
    packageName: "rxjs/operators",
  },
  {
    entryPoint: "projects/shared/src/public-api.ts",
    packageName: "@demo/shared",
  },
];

const externals = shareConfig.map((item) => item.packageName);

// Infer from tsconfig.json
// (if you need to shared local libs which is typical for a monorepo)
const mappedPaths = [
  {
    key: "@demo/shared",
    path: path.join(__dirname, "projects/shared/src/public-api.ts"),
  },
];

// Angular Compiler Options
const pluginOptions = createCompilerPluginOptions(
  {
    workspaceRoot: __dirname,
    optimizationOptions: {
      scripts: true,
      styles: { minify: true, inlineCritical: true },
      fonts: { inline: true },
    },
    sourcemapOptions: {
      vendor: false,
      hidden: false,
      scripts: false,
      styles: false,
    },
    tsconfig: "tsconfig.app.json",
    outputNames: { bundles: "[name]", media: "media/[name]" },
    fileReplacements: undefined,
    externalDependencies: externals,
    preserveSymlinks: undefined,
    stylePreprocessorOptions: { includePaths: [] },
    advancedOptimizations: true,
    inlineStyleLanguage: "css",
    jit: false,
    tailwindConfiguration: undefined,
  },
  ["chrome116.0"],
  undefined
);

// esbuild Options

const entryPoints = shareConfig.map((item) => ({
  in: item.entryPoint,
  out: path.join(__dirname, outDir, toBundleName(item.packageName)),
}));

const config = {
  entryPoints,
  outdir: outDir,
  entryNames: hash ? "[name]-[hash]" : "[name]",
  write: true,
  absWorkingDir: __dirname,
  external: externals,
  bundle: true,
  sourcemap: dev,
  minify: !dev,
  supported: {
    "async-await": false,
    "object-rest-spread": false,
  },
  platform: "browser",
  format: "esm",
  target: ["esnext"],
  plugins: [
    createCompilerPlugin(
      pluginOptions.pluginOptions,
      pluginOptions.styleOptions
    ),
    ...(mappedPaths && mappedPaths.length > 0
      ? [createSharedMappingsPlugin(mappedPaths)]
      : []),
  ],
  define: {
    ...(!dev ? { ngDevMode: "false" } : {}),
    ngJitMode: "false",
  },
};

console.log("\n[postbuild] Building externals ...");
esbuild.build(config);

// Create Import Map and update index.html
// (external importmaps are currently not supported)

const imports = shareConfig.reduce(
  (acc, item) => ({
    ...acc,
    [item.packageName]: '/' + toBundleName(item.packageName) + ".js",
  }),
  {}
);

const importMap = { imports };
const indexFileName = path.join(outDir, "index.html");
let index = fs.readFileSync(indexFileName, "utf-8");
index = index.replace(
  "<!-- placeholder:importmap -->",
  JSON.stringify(importMap, null, 2)
);

// Fix modulepreload: preload resolved files
index = index.replace(/<link rel="modulepreload" [^>]*>\s*\n*/g, "");

const preload = shareConfig
  .map(
    (item) =>
      `<link rel="modulepreload" href="${toBundleName(item.packageName)}.js" />`
  )
  .join("\n");
index = index.replace("<!-- placeholder:preload -->", preload);

fs.writeFileSync(indexFileName, index);
