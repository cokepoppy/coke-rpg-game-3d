import * as esbuild from "esbuild";

const context = await esbuild.context({
  entryPoints: ["wechat-debug/entry.js"],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  outfile: "wechat-debug/.generated/game-debug.js",
  sourcemap: true
});

await context.watch();
const server = await context.serve({ servedir: ".", port: 4174, host: "127.0.0.1" });
console.log(`WeChat portrait simulator: http://127.0.0.1:${server.port}/wechat-debug/`);
