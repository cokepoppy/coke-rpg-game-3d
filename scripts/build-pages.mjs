import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import esbuild from "esbuild";

const root = process.cwd();
const dist = path.join(root, "dist");
const buildVersion = process.env.PAGES_BUILD_VERSION || Date.now().toString(36);

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, "wechat-debug", "generated"), { recursive: true });
await writeFile(path.join(dist, ".nojekyll"), "");

await writeFile(path.join(dist, "index.html"), `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#10100e" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="苍山侠影" />
    <meta http-equiv="refresh" content="0; url=./wechat-debug/" />
    <link rel="icon" href="data:," />
    <title>苍山侠影 · 手机浏览器版</title>
    <style>html,body{margin:0;height:100%;display:grid;place-items:center;background:#10100e;color:#fff3d0;font-family:sans-serif}</style>
  </head>
  <body>
    <a href="./wechat-debug/" style="color:#fff3d0">进入苍山侠影</a>
  </body>
</html>
`);

const debugHtml = await import("node:fs/promises").then((fs) => fs.readFile(path.join(root, "wechat-debug/index.html"), "utf8"));
await writeFile(
  path.join(dist, "wechat-debug/index.html"),
  debugHtml.replace("./.generated/game-debug.js", `./generated/game-debug.js?v=${buildVersion}`)
);

await esbuild.build({
  entryPoints: [path.join(root, "wechat-debug/entry.js")],
  bundle: true,
  sourcemap: true,
  format: "iife",
  platform: "browser",
  outfile: path.join(dist, "wechat-debug/generated/game-debug.js")
});

const runtimeDirs = [
  "audio-pack",
  "battle-pack",
  "character-pack",
  "moon-valley-pack",
  "room-pack",
  "video-pack",
  "world-east-pack",
  "world-map-pack",
  "world-west-pack"
];

for (const dir of runtimeDirs) {
  await cp(path.join(root, "wechat-minigame", dir), path.join(dist, "wechat-minigame", dir), { recursive: true });
}

console.log("Built GitHub Pages artifact at dist/");
