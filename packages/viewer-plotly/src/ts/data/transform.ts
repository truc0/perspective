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
import {
    columnFromKey,
    getSplitGroups,
    computeSubplotGrid,
    buildSubplotAxes,
    buildSubplotTitle,
    buildPieDomain,
} from "./splitUtils";

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

export const PLOTLY_COLORS = [
    "#636efa",
    "#EF553B",
    "#00cc96",
    "#ab63fa",
    "#FFA15A",
    "#19d3f3",
    "#FF6692",
    "#B6E880",
    "#FF97FF",
    "#FECB52",
];

const PLOTLY_LAYOUT_BASE: Partial<Plotly.Layout> = {
    autosize: true,
    margin: { l: 50, r: 30, t: 30, b: 50 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "inherit" },
    colorway: PLOTLY_COLORS,
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

function getColumnColor(settings: PlotlySettings, colName: string): string {
    const idx = settings.mainValues.findIndex((mv) => mv.name === colName);
    return PLOTLY_COLORS[Math.max(0, idx) % PLOTLY_COLORS.length];
}

function hasUserColor(colName: string, styles?: PlotlyColumnStyles): boolean {
    return !!styles?.[colName]?.color;
}

export function toBarTraces(settings: PlotlySettings): TraceResult {
    if (settings.splitValues.length > 0) {
        return toBarTracesSplit(settings);
    }

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

function toBarTracesSplit(settings: PlotlySettings): TraceResult {
    const groups = getSplitGroups(settings.data);
    const groupEntries = [...groups.entries()];
    const { rows, cols } = computeSubplotGrid(groupEntries.length);
    const dateAxis = isDateCrossAxis(settings);
    const xData = dateAxis
        ? getDateCrossValues(settings)
        : getCrossLabels(settings);
    const styles = settings.plotly_column_styles;

    const traces: Plotly.Data[] = [];
    const layout: Partial<Plotly.Layout> = {
        ...PLOTLY_LAYOUT_BASE,
        margin: { ...PLOTLY_LAYOUT_BASE.margin, t: 50 },
        barmode: "group",
        annotations: [],
    };

    groupEntries.forEach(([groupName, keys], idx) => {
        const axes = buildSubplotAxes(idx, rows, cols);
        for (const fullKey of keys) {
            const colName = columnFromKey(fullKey);
            const trace: Plotly.Data = {
                type: "bar" as const,
                x: xData,
                y: settings.data.map((row) => row[fullKey]),
                name: colName,
                xaxis: axes.xRef,
                yaxis: axes.yRef,
                showlegend: idx === 0,
                legendgroup: colName,
            };
            applyBarStyle(trace, colName, styles);
            if (!hasUserColor(colName, styles)) {
                const color = getColumnColor(settings, colName);
                (trace as any).marker = {
                    ...(trace as any).marker,
                    color,
                };
            }
            traces.push(trace);
        }

        (layout as any)[axes.xAxisKey] = {
            domain: axes.xDomain,
            anchor: axes.yRef,
            title:
                idx === groupEntries.length - 1
                    ? settings.crossValues.map((cv) => cv.name).join(", ")
                    : undefined,
            ...(dateAxis ? { type: "date" } : {}),
        };
        (layout as any)[axes.yAxisKey] = {
            domain: axes.yDomain,
            anchor: axes.xRef,
        };
        (layout.annotations as Plotly.Annotations[]).push(
            buildSubplotTitle(
                groupName,
                axes.xDomain,
                axes.yDomain,
            ) as Plotly.Annotations,
        );
    });

    return { traces, layout };
}

export function toLineTraces(settings: PlotlySettings): TraceResult {
    if (settings.splitValues.length > 0) {
        return toLineTracesSplit(settings);
    }

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

function toLineTracesSplit(settings: PlotlySettings): TraceResult {
    const groups = getSplitGroups(settings.data);
    const groupEntries = [...groups.entries()];
    const { rows, cols } = computeSubplotGrid(groupEntries.length);
    const dateAxis = isDateCrossAxis(settings);
    const xData = dateAxis
        ? getDateCrossValues(settings)
        : getCrossLabels(settings);
    const styles = settings.plotly_column_styles;

    const traces: Plotly.Data[] = [];
    const layout: Partial<Plotly.Layout> = {
        ...PLOTLY_LAYOUT_BASE,
        margin: { ...PLOTLY_LAYOUT_BASE.margin, t: 50 },
        annotations: [],
    };

    groupEntries.forEach(([groupName, keys], idx) => {
        const axes = buildSubplotAxes(idx, rows, cols);
        for (const fullKey of keys) {
            const colName = columnFromKey(fullKey);
            const trace: Plotly.Data = {
                type: "scatter" as const,
                mode: "lines" as const,
                x: xData,
                y: settings.data.map((row) => row[fullKey]),
                name: colName,
                xaxis: axes.xRef,
                yaxis: axes.yRef,
                showlegend: idx === 0,
                legendgroup: colName,
            };
            applyLineStyle(trace, colName, styles);
            if (!hasUserColor(colName, styles)) {
                const color = getColumnColor(settings, colName);
                (trace as any).line = {
                    ...(trace as any).line,
                    color,
                };
            }
            traces.push(trace);
        }

        (layout as any)[axes.xAxisKey] = {
            domain: axes.xDomain,
            anchor: axes.yRef,
            title:
                idx === groupEntries.length - 1
                    ? settings.crossValues.map((cv) => cv.name).join(", ")
                    : undefined,
            ...(dateAxis ? { type: "date" } : {}),
        };
        (layout as any)[axes.yAxisKey] = {
            domain: axes.yDomain,
            anchor: axes.xRef,
        };
        (layout.annotations as Plotly.Annotations[]).push(
            buildSubplotTitle(
                groupName,
                axes.xDomain,
                axes.yDomain,
            ) as Plotly.Annotations,
        );
    });

    return { traces, layout };
}

export function toScatterTraces(settings: PlotlySettings): TraceResult {
    if (settings.splitValues.length > 0) {
        return toScatterTracesSplit(settings);
    }

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

/**
 * Scatter with split_by: each split group has paired X/Y columns. The first
 * mainValue column in the group is X, the second is Y (mirroring d3fc
 * xySplitData pairing logic).
 */
function toScatterTracesSplit(settings: PlotlySettings): TraceResult {
    const groups = getSplitGroups(settings.data);
    const groupEntries = [...groups.entries()];
    const { rows, cols } = computeSubplotGrid(groupEntries.length);
    const styles = settings.plotly_column_styles;
    const labels = getCrossLabels(settings);
    const nCols = settings.mainValues.length;

    const traces: Plotly.Data[] = [];
    const layout: Partial<Plotly.Layout> = {
        ...PLOTLY_LAYOUT_BASE,
        margin: { ...PLOTLY_LAYOUT_BASE.margin, t: 50 },
        annotations: [],
    };

    groupEntries.forEach(([groupName, keys], idx) => {
        const axes = buildSubplotAxes(idx, rows, cols);

        const xKey = keys[0];
        const yKey = nCols >= 2 ? keys[1] : undefined;

        const xValues = settings.data.map((row) => row[xKey]);
        const yValues = yKey ? settings.data.map((row) => row[yKey]) : [];

        const trace: Plotly.Data = {
            type: "scatter" as const,
            mode: "markers" as const,
            x: xValues,
            y: yValues,
            text: labels,
            name: groupName,
            xaxis: axes.xRef,
            yaxis: axes.yRef,
        };

        if (xKey) {
            const xColName = columnFromKey(xKey);
            applyScatterStyle(trace, xColName, styles);
            if (!hasUserColor(xColName, styles)) {
                const color = getColumnColor(settings, xColName);
                (trace as any).marker = {
                    ...(trace as any).marker,
                    color,
                };
            }
        }
        traces.push(trace);

        const xColName =
            settings.mainValues.length >= 1 ? settings.mainValues[0].name : "";
        const yColName =
            settings.mainValues.length >= 2 ? settings.mainValues[1].name : "";

        (layout as any)[axes.xAxisKey] = {
            domain: axes.xDomain,
            anchor: axes.yRef,
            title: idx === groupEntries.length - 1 ? xColName : undefined,
        };
        (layout as any)[axes.yAxisKey] = {
            domain: axes.yDomain,
            anchor: axes.xRef,
            title: idx === 0 ? yColName : undefined,
        };
        (layout.annotations as Plotly.Annotations[]).push(
            buildSubplotTitle(
                groupName,
                axes.xDomain,
                axes.yDomain,
            ) as Plotly.Annotations,
        );
    });

    return { traces, layout };
}

export function toPieTraces(settings: PlotlySettings): TraceResult {
    if (settings.splitValues.length > 0) {
        return toPieTracesSplit(settings);
    }

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

function toPieTracesSplit(settings: PlotlySettings): TraceResult {
    const groups = getSplitGroups(settings.data);
    const groupEntries = [...groups.entries()];
    const { rows, cols } = computeSubplotGrid(groupEntries.length);
    const labels = getCrossLabels(settings);
    const styles = settings.plotly_column_styles;

    const traces: Plotly.Data[] = [];
    const layout: Partial<Plotly.Layout> = {
        ...PLOTLY_LAYOUT_BASE,
        margin: { ...PLOTLY_LAYOUT_BASE.margin, t: 50 },
        annotations: [],
    };

    groupEntries.forEach(([groupName, keys], idx) => {
        const domain = buildPieDomain(idx, rows, cols);
        const valueKey = keys[0];
        const colName = columnFromKey(valueKey);
        const values = settings.data.map((row) => row[valueKey]);

        const trace: Plotly.Data = {
            type: "pie" as const,
            labels,
            values,
            textinfo: "label+percent",
            hoverinfo: "label+value+percent",
            domain,
            name: groupName,
            title: { text: groupName },
        };

        const s = styles?.[colName];
        if (s?.color) {
            (trace as any).marker = {
                ...(trace as any).marker,
                colors: labels.map(() => s.color),
            };
        }

        traces.push(trace);
    });

    return { traces, layout };
}
