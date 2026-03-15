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

const SLOPE_EVENTS = [
    "plotly_relayout",
    "plotly_relayouting",
    "plotly_afterplot",
] as const;

/**
 * Attach (or detach) listeners that display the slope of every user-drawn
 * line as a label tightly positioned at the line's midpoint.
 *
 * Uses a lightweight HTML overlay so the label updates in real-time during
 * drag (`plotly_relayouting`) without interfering with Plotly's own layout.
 *
 * Call after every `Plotly.react` so the listeners survive re-renders.
 */
export function attachDrawlineHandlers(
    container: HTMLElement,
    enabled: boolean,
): void {
    const gd = container as any;

    if (gd.__slopeUpdate) {
        for (const evt of SLOPE_EVENTS) {
            gd.removeListener?.(evt, gd.__slopeUpdate);
        }
        gd.__slopeUpdate = null;
    }
    gd.__slopeOverlay?.remove();
    gd.__slopeOverlay = null;

    if (!enabled) return;

    const overlay = document.createElement("div");
    overlay.style.cssText =
        "position:absolute;top:0;left:0;width:100%;height:100%;" +
        "pointer-events:none;z-index:1000;overflow:hidden;";
    container.style.position = "relative";
    container.appendChild(overlay);
    gd.__slopeOverlay = overlay;

    const update = () => syncOverlay(gd, overlay);
    gd.__slopeUpdate = update;
    for (const evt of SLOPE_EVENTS) {
        gd.on(evt, update);
    }
}

function syncOverlay(gd: any, overlay: HTMLElement): void {
    overlay.innerHTML = "";

    const shapes: any[] = gd.layout?.shapes || [];
    const xaxis = gd._fullLayout?.xaxis;
    const yaxis = gd._fullLayout?.yaxis;
    if (!xaxis || !yaxis) return;

    for (const s of shapes) {
        if (s.type !== "line") continue;

        const x0 = Number(s.x0);
        const y0 = Number(s.y0);
        const x1 = Number(s.x1);
        const y1 = Number(s.y1);
        if ([x0, y0, x1, y1].some(isNaN)) continue;

        const dx = x1 - x0;
        const slope = dx !== 0 ? (y1 - y0) / dx : Infinity;
        const label = isFinite(slope)
            ? `slope: ${slope.toFixed(4)}`
            : "slope: \u221e";

        const mid = dataToPixel(xaxis, yaxis, (x0 + x1) / 2, (y0 + y1) / 2);
        if (!mid) continue;

        const el = document.createElement("div");
        el.textContent = label;
        el.style.cssText =
            `position:absolute;left:${mid.px}px;top:${mid.py}px;` +
            "transform:translate(-50%,-100%) translateY(-4px);" +
            "padding:1px 5px;font-size:11px;line-height:1.4;" +
            "white-space:nowrap;pointer-events:none;" +
            "background:rgba(255,255,255,0.9);" +
            "border:1px solid rgba(0,0,0,0.25);border-radius:3px;";
        overlay.appendChild(el);
    }
}

function dataToPixel(
    xaxis: any,
    yaxis: any,
    x: number,
    y: number,
): { px: number; py: number } | null {
    const xr = xaxis.range;
    const yr = yaxis.range;
    if (!xr || !yr || xr[1] === xr[0] || yr[1] === yr[0]) return null;

    return {
        px: xaxis._offset + ((x - xr[0]) / (xr[1] - xr[0])) * xaxis._length,
        py: yaxis._offset + ((yr[1] - y) / (yr[1] - yr[0])) * yaxis._length,
    };
}
