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

import type { PlotlySettings } from "../types";

export interface TraceResult {
    traces: Plotly.Data[];
    layout: Partial<Plotly.Layout>;
}

/**
 * Extract the cross-value labels (x-axis categories) from row data.
 * When `crossValues` is configured, each row's `__ROW_PATH__` provides the
 * category label. Falls back to row indices when no grouping is present.
 */
function getCrossLabels(settings: PlotlySettings): string[] {
    return settings.data.map((row, i) => {
        if (row.__ROW_PATH__ && row.__ROW_PATH__.length > 0) {
            return row.__ROW_PATH__
                .filter((v: any) => v !== undefined)
                .join(", ");
        }
        if (settings.crossValues.length > 0) {
            const vals = settings.crossValues.map((cv) => row[cv.name]);
            return vals.join(", ");
        }
        return String(i);
    });
}

const PLOTLY_LAYOUT_BASE: Partial<Plotly.Layout> = {
    autosize: true,
    margin: { l: 50, r: 30, t: 30, b: 50 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "inherit" },
    legend: { orientation: "h", y: -0.2 },
};

export function toBarTraces(settings: PlotlySettings): TraceResult {
    const labels = getCrossLabels(settings);
    const traces: Plotly.Data[] = settings.mainValues.map((mv) => ({
        type: "bar" as const,
        x: labels,
        y: settings.data.map((row) => row[mv.name]),
        name: mv.name,
    }));

    const layout: Partial<Plotly.Layout> = {
        ...PLOTLY_LAYOUT_BASE,
        barmode: "group",
        xaxis: {
            title: settings.crossValues.map((cv) => cv.name).join(", "),
        },
        yaxis: {
            title:
                settings.mainValues.length === 1
                    ? settings.mainValues[0].name
                    : "",
        },
    };

    return { traces, layout };
}

export function toLineTraces(settings: PlotlySettings): TraceResult {
    const labels = getCrossLabels(settings);
    const traces: Plotly.Data[] = settings.mainValues.map((mv) => ({
        type: "scatter" as const,
        mode: "lines" as const,
        x: labels,
        y: settings.data.map((row) => row[mv.name]),
        name: mv.name,
    }));

    const layout: Partial<Plotly.Layout> = {
        ...PLOTLY_LAYOUT_BASE,
        xaxis: {
            title: settings.crossValues.map((cv) => cv.name).join(", "),
        },
        yaxis: {
            title:
                settings.mainValues.length === 1
                    ? settings.mainValues[0].name
                    : "",
        },
    };

    return { traces, layout };
}

export function toScatterTraces(settings: PlotlySettings): TraceResult {
    const xValues =
        settings.mainValues.length >= 1
            ? settings.data.map((row) => row[settings.mainValues[0].name])
            : [];
    const yValues =
        settings.mainValues.length >= 2
            ? settings.data.map((row) => row[settings.mainValues[1].name])
            : [];

    const traces: Plotly.Data[] = [
        {
            type: "scatter" as const,
            mode: "markers" as const,
            x: xValues,
            y: yValues,
            text: getCrossLabels(settings),
            name:
                settings.mainValues.length >= 2
                    ? `${settings.mainValues[0].name} vs ${settings.mainValues[1].name}`
                    : "",
        },
    ];

    const layout: Partial<Plotly.Layout> = {
        ...PLOTLY_LAYOUT_BASE,
        xaxis: {
            title:
                settings.mainValues.length >= 1
                    ? settings.mainValues[0].name
                    : "",
        },
        yaxis: {
            title:
                settings.mainValues.length >= 2
                    ? settings.mainValues[1].name
                    : "",
        },
    };

    return { traces, layout };
}

export function toPieTraces(settings: PlotlySettings): TraceResult {
    const labels = getCrossLabels(settings);
    const values =
        settings.mainValues.length >= 1
            ? settings.data.map((row) => row[settings.mainValues[0].name])
            : [];

    const traces: Plotly.Data[] = [
        {
            type: "pie" as const,
            labels,
            values,
            textinfo: "label+percent",
            hoverinfo: "label+value+percent",
        },
    ];

    const layout: Partial<Plotly.Layout> = {
        ...PLOTLY_LAYOUT_BASE,
    };

    return { traces, layout };
}
