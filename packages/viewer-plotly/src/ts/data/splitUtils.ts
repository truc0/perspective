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

/**
 * Extract the split group identity from a pipe-separated column key.
 * e.g. "East|Sales" → "East", "East|North|Sales" → "East|North"
 */
export function groupFromKey(key: string): string {
    return key.split("|").slice(0, -1).join("|");
}

/**
 * Extract the aggregate/column name from a pipe-separated column key.
 * e.g. "East|Sales" → "Sales"
 */
export function columnFromKey(key: string): string {
    return key.split("|").pop()!;
}

/**
 * Collect all non-__ROW_PATH__ keys from the first data row and group them
 * by their split prefix. Returns a Map preserving insertion order.
 * e.g. {"East": ["East|Sales","East|Profit"], "West": ["West|Sales","West|Profit"]}
 */
export function getSplitGroups(
    data: Record<string, any>[],
): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    const row = data[0];
    if (!row) return groups;

    for (const key of Object.keys(row)) {
        if (key === "__ROW_PATH__") continue;
        const group = groupFromKey(key);
        if (!groups.has(group)) {
            groups.set(group, []);
        }
        groups.get(group)!.push(key);
    }
    return groups;
}

const SUBPLOT_GAP = 0.12;

/**
 * Compute a roughly-square grid that fits `n` subplots.
 */
export function computeSubplotGrid(n: number): { rows: number; cols: number } {
    if (n <= 0) return { rows: 0, cols: 0 };
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    return { rows, cols };
}

/**
 * Axis key suffix for Plotly: first subplot uses "" (maps to xaxis/yaxis),
 * subsequent subplots use "2", "3", etc.
 */
export function axisId(idx: number): string {
    return idx === 0 ? "" : String(idx + 1);
}

/**
 * Axis reference for trace assignment: first subplot uses "x"/"y",
 * subsequent use "x2"/"y2", etc.
 */
export function axisRef(idx: number): string {
    return idx === 0 ? "" : String(idx + 1);
}

export interface SubplotAxisConfig {
    xAxisKey: string;
    yAxisKey: string;
    xRef: string;
    yRef: string;
    xDomain: [number, number];
    yDomain: [number, number];
}

/**
 * Build axis domain ranges and Plotly keys for the subplot at position `idx`
 * within an (rows × cols) grid.
 */
export function buildSubplotAxes(
    idx: number,
    rows: number,
    cols: number,
): SubplotAxisConfig {
    const colIdx = idx % cols;
    const rowIdx = Math.floor(idx / cols);
    const id = axisId(idx);

    const cellW = (1 - SUBPLOT_GAP * (cols - 1)) / cols;
    const cellH = (1 - SUBPLOT_GAP * (rows - 1)) / rows;

    const x0 = colIdx * (cellW + SUBPLOT_GAP);
    const x1 = x0 + cellW;
    const y0 = 1 - (rowIdx + 1) * (cellH + SUBPLOT_GAP) + SUBPLOT_GAP;
    const y1 = y0 + cellH;

    return {
        xAxisKey: `xaxis${id}`,
        yAxisKey: `yaxis${id}`,
        xRef: `x${axisRef(idx)}`,
        yRef: `y${axisRef(idx)}`,
        xDomain: [x0, x1],
        yDomain: [Math.max(0, y0), y1],
    };
}

/**
 * Build a Plotly annotation object used as a subplot title, positioned
 * just above the subplot area.
 */
export function buildSubplotTitle(
    title: string,
    xDomain: [number, number],
    yDomain: [number, number],
): Partial<Plotly.Annotations> {
    return {
        text: title,
        font: { size: 13 },
        showarrow: false,
        xref: "paper",
        yref: "paper",
        x: (xDomain[0] + xDomain[1]) / 2,
        y: yDomain[1] + 0.02,
        xanchor: "center",
        yanchor: "bottom",
    };
}

/**
 * Compute pie domain for subplot at `idx` in an (rows × cols) grid.
 */
export function buildPieDomain(
    idx: number,
    rows: number,
    cols: number,
): { x: [number, number]; y: [number, number] } {
    const colIdx = idx % cols;
    const rowIdx = Math.floor(idx / cols);

    const cellW = (1 - SUBPLOT_GAP * (cols - 1)) / cols;
    const cellH = (1 - SUBPLOT_GAP * (rows - 1)) / rows;

    const x0 = colIdx * (cellW + SUBPLOT_GAP);
    const x1 = x0 + cellW;
    const y0 = 1 - (rowIdx + 1) * (cellH + SUBPLOT_GAP) + SUBPLOT_GAP;
    const y1 = y0 + cellH;

    return {
        x: [x0, x1],
        y: [Math.max(0, y0), y1],
    };
}
