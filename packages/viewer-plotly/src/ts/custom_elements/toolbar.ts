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

import TOOLBAR_STYLE from "../../../dist/css/perspective-viewer-plotly-toolbar.css";
import type {
    PlotlySettings,
    PlotlyColumnStyle,
    PlotlyLineStyle,
} from "../types";

const stylesheet = new CSSStyleSheet();
stylesheet.replaceSync(TOOLBAR_STYLE);

const LINE_STYLES: PlotlyLineStyle[] = [
    "solid",
    "dash",
    "dot",
    "dashdot",
    "longdash",
];

interface PlotlyPluginElement extends HTMLElement {
    _settings: PlotlySettings | null;
    _chart: { plugin: { name: string } };
    _draw(): Promise<void>;
}

export class HTMLPerspectiveViewerPlotlyToolbarElement extends HTMLElement {
    private _initialized = false;
    private _panel: HTMLElement | null = null;
    private _panelOpen = false;
    private _outsideClickHandler: ((e: MouseEvent) => void) | null = null;

    connectedCallback(): void {
        if (this._initialized) {
            return;
        }

        this._initialized = true;
        this.setAttribute("slot", "statusbar-extra");
        this.attachShadow({ mode: "open" });
        this.shadowRoot!.adoptedStyleSheets.push(stylesheet);
        this.shadowRoot!.innerHTML = `
            <div id="toolbar">
                <span class="hover-target">
                    <span id="style_toggle" class="button">
                        <span></span>
                    </span>
                </span>
            </div>
        `;

        const toggle = this.shadowRoot!.querySelector(
            "#style_toggle",
        ) as HTMLElement;
        toggle.addEventListener("click", () => this._togglePanel());

        this._outsideClickHandler = (e: MouseEvent) => {
            if (this._panelOpen) {
                const path = e.composedPath();
                if (!path.includes(this)) {
                    this._closePanel();
                }
            }
        };
        document.addEventListener("mousedown", this._outsideClickHandler);
    }

    disconnectedCallback(): void {
        if (this._outsideClickHandler) {
            document.removeEventListener("mousedown", this._outsideClickHandler);
            this._outsideClickHandler = null;
        }
    }

    private _getPlugin(): PlotlyPluginElement | null {
        return this.previousElementSibling as PlotlyPluginElement | null;
    }

    private _isLineChart(): boolean {
        const plugin = this._getPlugin();
        if (!plugin?._chart) return false;
        return plugin._chart.plugin.name.toLowerCase().includes("line");
    }

    private _togglePanel(): void {
        if (this._panelOpen) {
            this._closePanel();
        } else {
            this._openPanel();
        }
    }

    private _closePanel(): void {
        if (this._panel) {
            this._panel.remove();
            this._panel = null;
        }
        this._panelOpen = false;
    }

    private _openPanel(): void {
        this._closePanel();
        const plugin = this._getPlugin();
        if (!plugin?._settings) return;

        const settings = plugin._settings;
        const styles = settings.plotly_column_styles || {};
        const isLine = this._isLineChart();

        const panel = document.createElement("div");
        panel.className = "style-panel";

        const title = document.createElement("div");
        title.className = "style-panel-title";
        title.textContent = "Column Styles";
        panel.appendChild(title);

        for (const mv of settings.mainValues) {
            const colStyle: PlotlyColumnStyle = styles[mv.name] || {};
            const row = document.createElement("div");
            row.className = "style-row";

            const label = document.createElement("span");
            label.className = "style-row-label";
            label.textContent = mv.name;
            label.title = mv.name;
            row.appendChild(label);

            const colorInput = document.createElement("input");
            colorInput.type = "color";
            colorInput.value = colStyle.color || "#1f77b4";
            colorInput.title = `Color for ${mv.name}`;
            colorInput.addEventListener("input", () => {
                this._updateColumnStyle(mv.name, {
                    color: colorInput.value,
                });
            });
            row.appendChild(colorInput);

            if (isLine) {
                const select = document.createElement("select");
                select.title = `Line style for ${mv.name}`;
                for (const ls of LINE_STYLES) {
                    const opt = document.createElement("option");
                    opt.value = ls;
                    opt.textContent = ls;
                    if ((colStyle.line_style || "solid") === ls) {
                        opt.selected = true;
                    }
                    select.appendChild(opt);
                }
                select.addEventListener("change", () => {
                    this._updateColumnStyle(mv.name, {
                        line_style: select.value as PlotlyLineStyle,
                    });
                });
                row.appendChild(select);
            }

            panel.appendChild(row);
        }

        const toolbar = this.shadowRoot!.querySelector("#toolbar")!;
        toolbar.appendChild(panel);
        this._panel = panel;
        this._panelOpen = true;
    }

    private _updateColumnStyle(
        columnName: string,
        update: Partial<PlotlyColumnStyle>,
    ): void {
        const plugin = this._getPlugin();
        if (!plugin?._settings) return;

        const settings = plugin._settings;
        if (!settings.plotly_column_styles) {
            settings.plotly_column_styles = {};
        }

        settings.plotly_column_styles[columnName] = {
            ...(settings.plotly_column_styles[columnName] || {}),
            ...update,
        };

        this.dispatchEvent(
            new Event("perspective-plugin-update", {
                bubbles: true,
                composed: true,
            }),
        );

        plugin._draw();
    }

    refreshColumns(): void {
        // Don't rebuild panel while open -- destroying the DOM kills
        // native pickers (color, select) mid-interaction.  The panel
        // reads fresh data from settings on next open.
    }
}
