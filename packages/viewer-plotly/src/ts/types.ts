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

import type {
    IPerspectiveViewerPlugin,
    ColumnConfigValues,
} from "@perspective-dev/viewer";

export type Type =
    | "integer"
    | "string"
    | "boolean"
    | "date"
    | "datetime"
    | "float";

export interface PlotlyChartPlugin {
    name: string;
    category: string;
    max_cells: number;
    max_columns: number;
    render_warning: boolean;
    initial: {
        type?: string;
        count?: number;
        names: string[];
    };
    selectMode?: string;
}

export interface PlotlyChart {
    (container: HTMLElement, settings: PlotlySettings): Promise<void>;
    plugin: PlotlyChartPlugin;
}

export interface MainValue {
    name: string;
    type: Type;
}

export type PlotlyLineStyle =
    | "solid"
    | "dash"
    | "dot"
    | "dashdot"
    | "longdash";

export interface PlotlyColumnStyle {
    color?: string;
    line_style?: PlotlyLineStyle;
}

export type PlotlyColumnStyles = Record<string, PlotlyColumnStyle>;

export interface PlotlySettings {
    realValues: string[];
    crossValues: { name: string; type: Type }[];
    mainValues: MainValue[];
    splitValues: { name: string; type: Type }[];
    filter: any[];
    data: Record<string, any>[];
    columns_config?: ColumnConfigValues;
    plotly_column_styles?: PlotlyColumnStyles;
    size: DOMRect;
    [key: string]: any;
}

export interface PlotlyChartElement extends IPerspectiveViewerPlugin {
    _chart: PlotlyChart | null;
    _settings: PlotlySettings | null;
    render_warning: boolean;
    _initialized: boolean;
    _container: HTMLElement;

    get category(): string;

    get max_cells(): number;
    set max_cells(value: number);

    get max_columns(): number;
    set max_columns(value: number);

    getContainer(): HTMLElement;
}
