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

import type { PlotlySettings, PlotlyColumnStyles, Type } from "../types";

export interface TraceResult {
    traces: Plotly.Data[];
    layout: Partial<Plotly.Layout>;
}

function formatCrossValue(value: any, type: Type): string {
    if (value == null) return "";
    if (type === "datetime") return new Date(value).toLocaleString();
    if (type === "date") return new Date(value).toLocaleDateString();
    return String(value);
}

function isDateCrossAxis(settings: PlotlySettings): boolean {
    return (
        settings.crossValues.length === 1 &&
        (settings.crossValues[0].type === "date" ||
            settings.crossValues[0].type === "datetime")
    );
}

function getDateCrossValues(settings: PlotlySettings): string[] {
    const cv = settings.crossValues[0];
    const isDatetime = cv.type === "datetime";
    return settings.data.map((row) => {
        const raw = row.__ROW_PATH__?.[0] ?? row[cv.name];
        if (raw == null) return "";
        const d = new Date(raw);
        return isDatetime ? d.toISOString() : d.toISOString().slice(0, 10);
    });
}

/**
 * Extract the cross-value labels (x-axis categories) from row data.
 * When `crossValues` is configured, each row's `__ROW_PATH__` provides the
 * category label. Falls back to row indices when no grouping is present.
 * Date/datetime values are formatted as readable strings.
 */
function getCrossLabels(settings: PlotlySettings): string[] {
    return settings.data.map((row, i) => {
        if (row.__ROW_PATH__ && row.__ROW_PATH__.length > 0) {
            return row.__ROW_PATH__
                .filter((v: any) => v !== undefined)
                .map((v: any, idx: number) =>
                    settings.crossValues[idx]
                        ? formatCrossValue(v, settings.crossValues[idx].type)
                        : String(v),
                )
                .join(", ");
        }
        if (settings.crossValues.length > 0) {
            const vals = settings.crossValues.map((cv) =>
                formatCrossValue(row[cv.name], cv.type),
            );
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

function applyBarStyle(
    trace: Plotly.Data,
    columnName: string,
    styles?: PlotlyColumnStyles,
): void {
    const s = styles?.[columnName];
    if (s?.color) {
        (trace as any).marker = { ...(trace as any).marker, color: s.color };
    }
}

function applyLineStyle(
    trace: Plotly.Data,
    columnName: string,
    styles?: PlotlyColumnStyles,
): void {
    const s = styles?.[columnName];
    if (!s) return;
    const line: Record<string, any> = { ...(trace as any).line };
    if (s.color) {
        line.color = s.color;
    }
    if (s.line_style) {
        line.dash = s.line_style;
    }
    (trace as any).line = line;
}

function applyScatterStyle(
    trace: Plotly.Data,
    columnName: string,
    styles?: PlotlyColumnStyles,
): void {
    const s = styles?.[columnName];
    if (s?.color) {
        (trace as any).marker = { ...(trace as any).marker, color: s.color };
    }
}

export function toBarTraces(settings: PlotlySettings): TraceResult {
    const dateAxis = isDateCrossAxis(settings);
    const xData = dateAxis
        ? getDateCrossValues(settings)
        : getCrossLabels(settings);
    const styles = settings.plotly_column_styles;
    const traces: Plotly.Data[] = settings.mainValues.map((mv) => {
        const trace: Plotly.Data = {
            type: "bar" as const,
            x: xData,
            y: settings.data.map((row) => row[mv.name]),
            name: mv.name,
        };
        applyBarStyle(trace, mv.name, styles);
        return trace;
    });

    const layout: Partial<Plotly.Layout> = {
        ...PLOTLY_LAYOUT_BASE,
        barmode: "group",
        xaxis: {
            title: settings.crossValues.map((cv) => cv.name).join(", "),
            ...(dateAxis ? { type: "date" } : {}),
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
    const dateAxis = isDateCrossAxis(settings);
    const xData = dateAxis
        ? getDateCrossValues(settings)
        : getCrossLabels(settings);
    const styles = settings.plotly_column_styles;
    const traces: Plotly.Data[] = settings.mainValues.map((mv) => {
        const trace: Plotly.Data = {
            type: "scatter" as const,
            mode: "lines" as const,
            x: xData,
            y: settings.data.map((row) => row[mv.name]),
            name: mv.name,
        };
        applyLineStyle(trace, mv.name, styles);
        return trace;
    });

    const layout: Partial<Plotly.Layout> = {
        ...PLOTLY_LAYOUT_BASE,
        xaxis: {
            title: settings.crossValues.map((cv) => cv.name).join(", "),
            ...(dateAxis ? { type: "date" } : {}),
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

    const styles = settings.plotly_column_styles;
    const trace: Plotly.Data = {
        type: "scatter" as const,
        mode: "markers" as const,
        x: xValues,
        y: yValues,
        text: getCrossLabels(settings),
        name:
            settings.mainValues.length >= 2
                ? `${settings.mainValues[0].name} vs ${settings.mainValues[1].name}`
                : "",
    };

    if (settings.mainValues.length >= 1) {
        applyScatterStyle(trace, settings.mainValues[0].name, styles);
    }

    const traces: Plotly.Data[] = [trace];

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

    const trace: Plotly.Data = {
        type: "pie" as const,
        labels,
        values,
        textinfo: "label+percent",
        hoverinfo: "label+value+percent",
    };

    const styles = settings.plotly_column_styles;
    if (settings.mainValues.length >= 1) {
        const s = styles?.[settings.mainValues[0].name];
        if (s?.color) {
            (trace as any).marker = {
                ...(trace as any).marker,
                colors: labels.map(() => s.color),
            };
        }
    }

    const traces: Plotly.Data[] = [trace];

    const layout: Partial<Plotly.Layout> = {
        ...PLOTLY_LAYOUT_BASE,
    };

    return { traces, layout };
}
