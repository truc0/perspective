// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ ██████ ██████ ██████       █      █      █      █      █ █▄  ▀███ █       ┃
// ┃ ▄▄▄▄▄█ █▄▄▄▄▄ ▄▄▄▄▄█  ▀▀▀▀▀█▀▀▀▀▀ █ ▀▀▀▀▀█ ████████▌▐███ ███▄  ▀█ █ ▀▀▀▀▀ ┃
// ┃ █▀▀▀▀▀ █▀▀▀▀▀ █▀██▀▀ ▄▄▄▄▄ █ ▄▄▄▄▄█ ▄▄▄▄▄█ ████████▌▐███ █████▄   █ ▄▄▄▄▄ ┃
// ┃ █      ██████ █  ▀█▄       █ ██████      █      ███▌▐███ ███████▄ █       ┃
// ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
// ┃ Copyright (c) 2017, the Perspective Authors.                              ┃
// ┃ ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ ┃
// ┃ This file is part of the Perspective library, distributed under the terms ┃
// ┃ of the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { NodeModulesExternal } from "@perspective-dev/esbuild-plugin/external.js";
import { build } from "@perspective-dev/esbuild-plugin/build.js";
import { BuildCss } from "@prospective.co/procss/target/cjs/procss.js";
import { promisify } from "node:util";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path_mod from "node:path";

const exec = promisify(execSync);

const BUILD = [
    {
        entryPoints: [
            "src/ts/index/bar.ts",
            "src/ts/index/line.ts",
            "src/ts/index/scatter.ts",
            "src/ts/index/pie.ts",
        ],
        define: {
            global: "window",
        },
        plugins: [NodeModulesExternal()],
        format: "esm",
        metafile: false,
        loader: {
            ".css": "text",
        },
        outdir: "dist/esm",
    },
    {
        entryPoints: ["src/ts/index.ts"],
        define: {
            global: "window",
        },
        plugins: [NodeModulesExternal()],
        format: "esm",
        loader: {
            ".css": "text",
        },
        outfile: "dist/esm/perspective-viewer-plotly.js",
    },
    {
        entryPoints: ["src/ts/index.ts"],
        define: {
            global: "window",
        },
        plugins: [],
        format: "esm",
        loader: {
            ".css": "text",
        },
        outfile: "dist/cdn/perspective-viewer-plotly.js",
    },
];

function add(builder, path) {
    builder.add(
        path,
        fs.readFileSync(path_mod.join("./src/less", path)).toString(),
    );
}

async function compile_css() {
    fs.mkdirSync("dist/css", { recursive: true });

    const builder1 = new BuildCss("");
    add(builder1, "./chart.less");
    fs.writeFileSync(
        "dist/css/perspective-viewer-plotly.css",
        builder1.compile().get("chart.css"),
    );

    const builder2 = new BuildCss("");
    add(builder2, "./toolbar.less");
    fs.writeFileSync(
        "dist/css/perspective-viewer-plotly-toolbar.css",
        builder2.compile().get("toolbar.css"),
    );
}

async function build_all() {
    await compile_css();
    await Promise.all(BUILD.map(build)).catch(() => process.exit(1));

    try {
        await exec("tsc", { stdio: "inherit" });
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

build_all();
