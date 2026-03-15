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

import Plotly from "plotly.js-basic-dist-min";
import charts from "../charts/charts";
import style from "../../../dist/css/perspective-viewer-plotly.css";
import { HTMLPerspectiveViewerElement } from "@perspective-dev/viewer";
import type * as psp_types from "@perspective-dev/viewer";

import { PlotlyChart, PlotlySettings, Type } from "../types";

const DEFAULT_PLUGIN_SETTINGS = {
    initial: {
        type: "number",
        count: 1,
        names: [],
    },
    selectMode: "select",
};

const PLOTLY_STYLES = [style].map((x) => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(x);
    return sheet;
});

const EXCLUDED_SETTINGS = [
    "crossValues",
    "mainValues",
    "realValues",
    "splitValues",
    "filter",
    "data",
    "size",
    "columns_config",
];

async function register_element(plugin_name: string) {
    const perspectiveViewerClass = customElements.get("perspective-viewer");
    await perspectiveViewerClass.registerPlugin(plugin_name);
}

export function register(...plugin_names: string[]) {
    const plugins = new Set(
        plugin_names.length > 0
            ? plugin_names
            : charts.map((chart) => chart.plugin.name),
    );

    charts.forEach((chart) => {
        if (plugins.has(chart.plugin.name)) {
            const name = chart.plugin.name
                .toLowerCase()
                .replace(/[ \t\r\n\/]*/g, "");

            const plugin_name = `perspective-viewer-${name}`;
            customElements.define(
                plugin_name,
                class extends HTMLPerspectiveViewerPlotlyPluginElement {
                    _chart = chart;
                    static _chart = chart;
                },
            );

            customElements
                .whenDefined("perspective-viewer")
                .then(() => register_element(plugin_name));
        }
    });
}

class HTMLPerspectiveViewerPlotlyPluginElement extends HTMLElement {
    _chart: PlotlyChart;
    static _chart: PlotlyChart;
    _settings: PlotlySettings | null;
    render_warning: boolean;
    _initialized: boolean;
    _container: HTMLElement;
    _staged_view: any;
    config: any;

    constructor() {
        super();
        this._settings = null;
        this.render_warning = true;
    }

    connectedCallback() {
        if (!this._initialized) {
            this.attachShadow({ mode: "open" });
            for (const sheet of PLOTLY_STYLES) {
                this.shadowRoot!.adoptedStyleSheets.push(sheet);
            }

            this.shadowRoot!.innerHTML +=
                `<div id="container" class="chart"></div>`;
            this._container = this.shadowRoot!.querySelector(
                ".chart",
            ) as HTMLElement;
            this._initialized = true;
        }
    }

    get name() {
        return this._chart.plugin.name;
    }

    get category() {
        return this._chart.plugin.category;
    }

    get select_mode() {
        return this._chart.plugin.selectMode || "select";
    }

    get group_rollups(): string[] {
        return ["flat"];
    }

    get min_config_columns() {
        return (
            this._chart.plugin.initial?.count ||
            DEFAULT_PLUGIN_SETTINGS.initial.count
        );
    }

    get config_column_names() {
        return (
            this._chart.plugin.initial?.names ||
            DEFAULT_PLUGIN_SETTINGS.initial.names
        );
    }

    static get max_cells() {
        return this._chart.plugin.max_cells || 10_000;
    }

    static set max_cells(x) {
        this._chart.plugin.max_cells = x;
    }

    static get max_columns() {
        return this._chart.plugin.max_columns || 50;
    }

    static set max_columns(x) {
        this._chart.plugin.max_columns = x;
    }

    get max_cells() {
        return this._chart.plugin.max_cells || 10_000;
    }

    set max_cells(x) {
        this._chart.plugin.max_cells = x;
    }

    get max_columns() {
        return this._chart.plugin.max_columns || 50;
    }

    set max_columns(x) {
        this._chart.plugin.max_columns = x;
    }

    async render() {
        try {
            const dataUrl = await Plotly.toImage(this._container, {
                format: "png",
                width: this._container.offsetWidth,
                height: this._container.offsetHeight,
            });
            const response = await fetch(dataUrl);
            return await response.blob();
        } catch {
            return null;
        }
    }

    async draw(view: any, end_col?: number, end_row?: number) {
        if (this.offsetParent === null) {
            this._staged_view = [view, end_col, end_row];
            return;
        }

        this._staged_view = undefined;
        await this.update(view, end_col, end_row, true);
    }

    async update(
        view: any,
        end_col?: number,
        end_row?: number,
        clear = false,
    ) {
        if (this.offsetParent === null) {
            return;
        }

        const viewer = this.parentElement as HTMLPerspectiveViewerElement;
        const window_args: Record<string, any> = { leaves_only: true };
        if (end_col) window_args.end_col = end_col;
        if (end_row) window_args.end_row = end_row;

        const jsonp = view.to_columns_string(window_args);
        const metadata = await Promise.all([
            viewer.getViewConfig(),
            viewer.getTable().then((table: any) => table.schema()),
            view.expression_schema(false),
            view.schema(false),
            jsonp,
            view.get_config(),
        ]);

        const [
            real_config,
            table_schema,
            expression_schema,
            view_schema,
            json_string,
            config,
        ] = metadata;

        const json2 = JSON.parse(json_string as string);
        const keys = Object.keys(json2);
        const json = {
            row(ridx: number) {
                const obj: Record<string, any> = {};
                for (const name of keys) {
                    obj[name] = json2[name][ridx];
                }
                return obj;
            },
        };

        this.config = real_config;
        const realValues = this.config.columns;

        const get_pivot_column_type = function (column: string) {
            let type = table_schema[column];
            if (!type) {
                type = expression_schema[column];
            }
            return type;
        };

        const { columns, group_by, split_by, filter } = config;
        const first_col = json2[Object.keys(json2)[0]] || [];
        const filtered =
            group_by.length > 0
                ? first_col.reduce(
                      (
                          acc: { rows: any[]; aggs: any[]; agg_paths: any[] },
                          _: any,
                          idx: number,
                      ) => {
                          const col = json.row(idx);
                          if (
                              col.__ROW_PATH__ &&
                              col.__ROW_PATH__.length == group_by.length
                          ) {
                              acc.agg_paths.push(acc.aggs.slice());
                              acc.rows.push(col);
                          } else {
                              const len = col.__ROW_PATH__.filter(
                                  (x: any) => x !== undefined,
                              ).length;
                              acc.aggs[len] = col;
                              acc.aggs = acc.aggs.slice(0, len + 1);
                          }
                          return acc;
                      },
                      { rows: [], aggs: [], agg_paths: [] },
                  )
                : {
                      rows: first_col.map((_: any, idx: number) =>
                          json.row(idx),
                      ),
                  };

        const dataMap = (col: any, i: number) =>
            !group_by.length ? { ...col, __ROW_PATH__: [i] } : col;
        const mapped = filtered.rows.map(dataMap);

        const settings: PlotlySettings = {
            realValues,
            crossValues: group_by.map((r: string) => ({
                name: r,
                type: get_pivot_column_type(r),
            })),
            mainValues: columns.map((a: string) => ({
                name: a,
                type: view_schema[a],
            })),
            splitValues: split_by.map((r: string) => ({
                name: r,
                type: get_pivot_column_type(r),
            })),
            filter,
            data: mapped,
            size: this._container.getBoundingClientRect(),
            ...this.config.plugin_config,
        };

        const handler = {
            set: (obj: any, prop: string, value: any) => {
                if (!EXCLUDED_SETTINGS.includes(prop)) {
                    this._container?.dispatchEvent(
                        new Event("perspective-plugin-update", {
                            bubbles: true,
                            composed: true,
                        }),
                    );
                }
                obj[prop] = value;
                return true;
            },
        };

        this._settings = new Proxy(
            {
                ...this._settings,
                ...settings,
            },
            handler,
        );

        if (clear) {
            this._container.innerHTML = "";
        }

        await this._draw();
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    async clear() {
        if (this._container) {
            try {
                Plotly.purge(this._container);
            } catch {
                // no-op if purge fails (e.g. no chart rendered yet)
            }
            this._container.innerHTML = "";
        }
    }

    async _draw() {
        if (this.offsetParent !== null && this._settings) {
            if (this._settings.data.length > 0) {
                await this._chart(this._container, this._settings);
            } else {
                this._container.classList.add("disabled");
            }
        }
    }

    async resize() {
        if (this.offsetParent !== null) {
            if (this._settings?.data !== undefined) {
                try {
                    Plotly.Plots.resize(this._container);
                } catch {
                    await this._draw();
                }
            } else if (this._staged_view) {
                const [view, end_col, end_row] = this._staged_view;
                this._staged_view = undefined;
                this.draw(view, end_col, end_row);
            }
        }
    }

    async restyle() {
        if (this._settings && this.isConnected) {
            await this._draw();
        }
    }

    async delete() {
        if (this._container) {
            try {
                Plotly.purge(this._container);
            } catch {
                // no-op
            }
            this._container.innerHTML = "";
        }
    }

    getContainer() {
        return this._container;
    }

    save() {
        const settings = { ...this._settings };
        EXCLUDED_SETTINGS.forEach((s) => {
            delete settings[s];
        });
        return settings;
    }

    restore(
        settings: PlotlySettings,
        columns_config: psp_types.ColumnConfigValues,
    ) {
        const new_settings: Partial<PlotlySettings> = {};
        for (const name of EXCLUDED_SETTINGS) {
            if (this._settings?.[name] !== undefined) {
                new_settings[name] = this._settings?.[name];
            }
        }
        this._settings = {
            ...new_settings,
            ...settings,
            columns_config,
        } as PlotlySettings;
    }
}
