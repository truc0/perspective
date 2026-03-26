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
    PlotlyPluginConfig,
    PlotlyLegendPosition,
    TradingHoursConfig,
    TradingSession,
} from "../types";
import { DEFAULT_PLUGIN_CONFIG } from "../config";
import { PLOTLY_COLORS } from "../data/transform";

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
            document.removeEventListener(
                "mousedown",
                this._outsideClickHandler,
            );
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

        this._buildConfigSection(panel, plugin, settings);
        this._buildTradingHoursSection(panel, plugin, settings);

        const title = document.createElement("div");
        title.className = "style-panel-title";
        title.textContent = "Column Styles";
        panel.appendChild(title);

        for (let mvIdx = 0; mvIdx < settings.mainValues.length; mvIdx++) {
            const mv = settings.mainValues[mvIdx];
            const colStyle: PlotlyColumnStyle = styles[mv.name] || {};
            const row = document.createElement("div");
            row.className = "style-row";

            const label = document.createElement("span");
            label.className = "style-row-label";
            label.textContent = mv.name;
            label.title = mv.name;
            row.appendChild(label);

            const defaultColor = PLOTLY_COLORS[mvIdx % PLOTLY_COLORS.length];
            const colorInput = document.createElement("input");
            colorInput.type = "color";
            colorInput.value = colStyle.color || defaultColor;
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

    private _buildConfigSection(
        panel: HTMLElement,
        plugin: PlotlyPluginElement,
        settings: PlotlySettings,
    ): void {
        const config = settings.plotly_plugin_config ?? {};

        const section = document.createElement("div");
        section.className = "config-section";

        const sectionTitle = document.createElement("div");
        sectionTitle.className = "style-panel-title";
        sectionTitle.textContent = "Chart Options";
        section.appendChild(sectionTitle);

        const OPTIONS: {
            key: keyof Omit<PlotlyPluginConfig, "tradingHours" | "legendPosition">;
            label: string;
        }[] = [
            { key: "scrollZoom", label: "Scroll Zoom" },
            { key: "enableDrawline", label: "Enable Drawline" },
            { key: "showlegend", label: "Show Legend" },
        ];

        const showLegendOn = config.showlegend ?? DEFAULT_PLUGIN_CONFIG.showlegend;

        const legendRow = document.createElement("label");
        legendRow.className = "config-row";
        legendRow.style.display = showLegendOn ? "" : "none";
        const legendLabel = document.createElement("span");
        legendLabel.textContent = "Legend Position";
        legendRow.appendChild(legendLabel);
        const legendSelect = document.createElement("select");
        const LEGEND_OPTIONS: { value: PlotlyLegendPosition; label: string }[] = [
            { value: "bottom", label: "Bottom" },
            { value: "right", label: "Right" },
            { value: "left", label: "Left" },
        ];
        const currentPos = config.legendPosition ?? DEFAULT_PLUGIN_CONFIG.legendPosition;
        for (const lo of LEGEND_OPTIONS) {
            const opt = document.createElement("option");
            opt.value = lo.value;
            opt.textContent = lo.label;
            if (lo.value === currentPos) {
                opt.selected = true;
            }
            legendSelect.appendChild(opt);
        }
        legendSelect.addEventListener("change", () => {
            this._updatePluginConfig(
                "legendPosition",
                legendSelect.value as PlotlyLegendPosition,
            );
        });
        legendRow.appendChild(legendSelect);

        for (const opt of OPTIONS) {
            const row = document.createElement("label");
            row.className = "config-row";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked =
                config[opt.key] ?? DEFAULT_PLUGIN_CONFIG[opt.key];
            checkbox.addEventListener("change", () => {
                this._updatePluginConfig(opt.key, checkbox.checked);
                if (opt.key === "showlegend") {
                    legendRow.style.display = checkbox.checked ? "" : "none";
                }
            });
            row.appendChild(checkbox);

            const label = document.createElement("span");
            label.textContent = opt.label;
            row.appendChild(label);

            section.appendChild(row);
        }

        section.appendChild(legendRow);

        panel.appendChild(section);
    }

    private _updatePluginConfig(
        key: keyof PlotlyPluginConfig,
        value: boolean | string,
    ): void {
        const plugin = this._getPlugin();
        if (!plugin?._settings) return;

        const settings = plugin._settings;
        if (!settings.plotly_plugin_config) {
            settings.plotly_plugin_config = {};
        }

        settings.plotly_plugin_config = {
            ...settings.plotly_plugin_config,
            [key]: value,
        };

        this.dispatchEvent(
            new Event("perspective-plugin-update", {
                bubbles: true,
                composed: true,
            }),
        );

        plugin._draw();
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

    private _buildTradingHoursSection(
        panel: HTMLElement,
        plugin: PlotlyPluginElement,
        settings: PlotlySettings,
    ): void {
        const thConfig: TradingHoursConfig = settings.plotly_plugin_config
            ?.tradingHours ?? {
            enabled: false,
            sessions: [
                { start: "09:00", end: "11:30" },
                { start: "13:30", end: "15:00" },
            ],
            excludeWeekends: true,
        };

        const section = document.createElement("div");
        section.className = "trading-hours-section";

        const sectionTitle = document.createElement("div");
        sectionTitle.className = "style-panel-title";
        sectionTitle.textContent = "Trading Hours";
        section.appendChild(sectionTitle);

        const enableRow = document.createElement("label");
        enableRow.className = "config-row";
        const enableCheckbox = document.createElement("input");
        enableCheckbox.type = "checkbox";
        enableCheckbox.checked = thConfig.enabled;
        enableRow.appendChild(enableCheckbox);
        const enableLabel = document.createElement("span");
        enableLabel.textContent = "Enable Trading Hours";
        enableRow.appendChild(enableLabel);
        section.appendChild(enableRow);

        const detailContainer = document.createElement("div");
        detailContainer.className = "trading-hours-detail";
        detailContainer.style.display = thConfig.enabled ? "block" : "none";

        const weekendRow = document.createElement("label");
        weekendRow.className = "config-row";
        const weekendCheckbox = document.createElement("input");
        weekendCheckbox.type = "checkbox";
        weekendCheckbox.checked = thConfig.excludeWeekends;
        weekendRow.appendChild(weekendCheckbox);
        const weekendLabel = document.createElement("span");
        weekendLabel.textContent = "Exclude Weekends";
        weekendRow.appendChild(weekendLabel);
        detailContainer.appendChild(weekendRow);

        const sessionList = document.createElement("div");
        sessionList.className = "trading-session-list";

        const renderSessions = () => {
            sessionList.innerHTML = "";
            const sessions = thConfig.sessions;
            for (let i = 0; i < sessions.length; i++) {
                const s = sessions[i];
                const row = document.createElement("div");
                row.className = "trading-session-row";

                const startInput = document.createElement("input");
                startInput.type = "time";
                startInput.value = s.start;
                startInput.addEventListener("change", () => {
                    sessions[i] = { ...sessions[i], start: startInput.value };
                    this._updateTradingHours(thConfig);
                });

                const sep = document.createElement("span");
                sep.className = "trading-session-sep";
                sep.textContent = "\u2013";

                const endInput = document.createElement("input");
                endInput.type = "time";
                endInput.value = s.end;
                endInput.addEventListener("change", () => {
                    sessions[i] = { ...sessions[i], end: endInput.value };
                    this._updateTradingHours(thConfig);
                });

                const removeBtn = document.createElement("button");
                removeBtn.className = "trading-session-remove";
                removeBtn.textContent = "\u00d7";
                removeBtn.title = "Remove session";
                removeBtn.addEventListener("click", () => {
                    sessions.splice(i, 1);
                    this._updateTradingHours(thConfig);
                    renderSessions();
                });

                row.appendChild(startInput);
                row.appendChild(sep);
                row.appendChild(endInput);
                row.appendChild(removeBtn);
                sessionList.appendChild(row);
            }
        };

        renderSessions();
        detailContainer.appendChild(sessionList);

        const addBtn = document.createElement("button");
        addBtn.className = "trading-session-add";
        addBtn.textContent = "+ Add Session";
        addBtn.addEventListener("click", () => {
            thConfig.sessions.push({ start: "09:00", end: "17:00" });
            this._updateTradingHours(thConfig);
            renderSessions();
        });
        detailContainer.appendChild(addBtn);

        enableCheckbox.addEventListener("change", () => {
            thConfig.enabled = enableCheckbox.checked;
            detailContainer.style.display = thConfig.enabled ? "block" : "none";
            this._updateTradingHours(thConfig);
        });

        weekendCheckbox.addEventListener("change", () => {
            thConfig.excludeWeekends = weekendCheckbox.checked;
            this._updateTradingHours(thConfig);
        });

        section.appendChild(detailContainer);
        panel.appendChild(section);
    }

    private _updateTradingHours(config: TradingHoursConfig): void {
        const plugin = this._getPlugin();
        if (!plugin?._settings) return;

        const settings = plugin._settings;
        if (!settings.plotly_plugin_config) {
            settings.plotly_plugin_config = {};
        }

        settings.plotly_plugin_config = {
            ...settings.plotly_plugin_config,
            tradingHours: { ...config, sessions: [...config.sessions] },
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
