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

import type { IPerspectiveViewerPlugin } from "@perspective-dev/viewer";
import { register } from "./plugin/plugin";

await register();

declare global {
    interface CustomElementRegistry {
        get(
            tagName: "perspective-viewer-plotlybar",
        ): typeof HTMLPerspectiveViewerPlotlyPluginElement;
        get(
            tagName: "perspective-viewer-plotlyline",
        ): typeof HTMLPerspectiveViewerPlotlyPluginElement;
        get(
            tagName: "perspective-viewer-plotlyscatter",
        ): typeof HTMLPerspectiveViewerPlotlyPluginElement;
        get(
            tagName: "perspective-viewer-plotlypie",
        ): typeof HTMLPerspectiveViewerPlotlyPluginElement;

        whenDefined(
            tagName: "perspective-viewer-plotlybar",
        ): Promise<void>;
        whenDefined(
            tagName: "perspective-viewer-plotlyline",
        ): Promise<void>;
        whenDefined(
            tagName: "perspective-viewer-plotlyscatter",
        ): Promise<void>;
        whenDefined(
            tagName: "perspective-viewer-plotlypie",
        ): Promise<void>;
    }

    export interface HTMLPerspectiveViewerPlotlyPluginElement
        extends IPerspectiveViewerPlugin {}

    export class HTMLPerspectiveViewerPlotlyPluginElement
        extends HTMLElement
        implements IPerspectiveViewerPlugin
    {
        static get max_cells(): number;
        static set max_cells(value: number);
    }
}
