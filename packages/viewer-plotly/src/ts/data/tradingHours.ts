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

import type { TradingHoursConfig, TradingSession } from "../types";

/**
 * Parse "HH:MM" to decimal hours (e.g. "09:30" -> 9.5).
 */
export function parseTimeToHours(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h + (m || 0) / 60;
}

interface Interval {
    start: number;
    end: number;
}

/**
 * Normalize trading sessions into sorted, merged intervals within [0, 24).
 * Cross-midnight sessions (end < start) are split into two segments.
 */
function normalizeSessionIntervals(sessions: TradingSession[]): Interval[] {
    const intervals: Interval[] = [];
    for (const s of sessions) {
        const start = parseTimeToHours(s.start);
        const end = parseTimeToHours(s.end);
        if (end > start) {
            intervals.push({ start, end });
        } else if (end < start) {
            intervals.push({ start, end: 24 });
            intervals.push({ start: 0, end });
        }
    }

    intervals.sort((a, b) => a.start - b.start);

    const merged: Interval[] = [];
    for (const iv of intervals) {
        const last = merged[merged.length - 1];
        if (last && iv.start <= last.end) {
            last.end = Math.max(last.end, iv.end);
        } else {
            merged.push({ ...iv });
        }
    }
    return merged;
}

/**
 * Convert trading sessions into Plotly rangebreaks by computing the
 * complement (non-trading) intervals within a 24-hour day.
 */
export function sessionsToRangebreaks(
    config: TradingHoursConfig,
): Record<string, any>[] {
    const breaks: Record<string, any>[] = [];

    if (config.excludeWeekends) {
        breaks.push({ bounds: ["sat", "mon"], pattern: "day of week" });
    }

    const sessions = config.sessions;
    if (!sessions || sessions.length === 0) {
        return breaks;
    }

    const merged = normalizeSessionIntervals(sessions);
    if (merged.length === 0) {
        return breaks;
    }

    const gaps: Interval[] = [];

    if (merged[0].start > 0) {
        gaps.push({ start: 0, end: merged[0].start });
    }
    for (let i = 0; i < merged.length - 1; i++) {
        gaps.push({ start: merged[i].end, end: merged[i + 1].start });
    }
    if (merged[merged.length - 1].end < 24) {
        gaps.push({ start: merged[merged.length - 1].end, end: 24 });
    }

    // Adjacent gaps at day boundaries (0 and 24) form a single cross-midnight
    // break. Merge them so Plotly sees one rangebreak with bounds [start, end]
    // where start > end, meaning "from start to end crossing midnight".
    if (
        gaps.length >= 2 &&
        gaps[0].start === 0 &&
        gaps[gaps.length - 1].end === 24
    ) {
        const crossStart = gaps[gaps.length - 1].start;
        const crossEnd = gaps[0].end;
        gaps.shift();
        gaps.pop();
        gaps.push({ start: crossStart, end: crossEnd });
    }

    for (const gap of gaps) {
        breaks.push({ bounds: [gap.start, gap.end], pattern: "hour" });
    }

    return breaks;
}

/**
 * Apply trading hours rangebreaks to every xaxis in the Plotly layout.
 * No-ops when trading hours are disabled or the axis is not date-based.
 */
export function applyTradingHoursToLayout(
    layout: Partial<Plotly.Layout>,
    config: TradingHoursConfig | undefined,
    isDateAxis: boolean,
): void {
    if (!config?.enabled || !isDateAxis) {
        return;
    }

    const rangebreaks = sessionsToRangebreaks(config);
    if (rangebreaks.length === 0) {
        return;
    }

    for (const key of Object.keys(layout)) {
        if (key.startsWith("xaxis")) {
            (layout as any)[key].rangebreaks = rangebreaks;
        }
    }

    if ((layout as any).xaxis && !(layout as any).xaxis.rangebreaks) {
        (layout as any).xaxis.rangebreaks = rangebreaks;
    }
}
