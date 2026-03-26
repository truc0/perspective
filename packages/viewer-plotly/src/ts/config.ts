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

import type { PlotlyPluginConfig } from "./types";
import { applyTradingHoursToLayout } from "./data/tradingHours";

export const DEFAULT_PLUGIN_CONFIG: Required<PlotlyPluginConfig> = {
    scrollZoom: true,
    enableDrawline: false,
    showlegend: true,
    tradingHours: {
        enabled: false,
        sessions: [
            { start: "09:00", end: "11:30" },
            { start: "13:30", end: "15:00" },
        ],
        excludeWeekends: true,
    },
};

export function resolveConfig(
    config?: PlotlyPluginConfig,
): Required<PlotlyPluginConfig> {
    return { ...DEFAULT_PLUGIN_CONFIG, ...config };
}

export function buildPlotlyConfig(
    config: Required<PlotlyPluginConfig>,
): Partial<Plotly.Config> {
    const plotlyConfig: Partial<Plotly.Config> = {
        responsive: true,
        scrollZoom: config.scrollZoom,
    };

    if (config.enableDrawline) {
        (plotlyConfig as any).modeBarButtonsToAdd = ["drawline"];
    }

    return plotlyConfig;
}

export function applyConfigToLayout(
    layout: Partial<Plotly.Layout>,
    config: Required<PlotlyPluginConfig>,
    isDateAxis?: boolean,
): void {
    layout.showlegend = config.showlegend;
    applyTradingHoursToLayout(layout, config.tradingHours, isDateAxis ?? false);
}
