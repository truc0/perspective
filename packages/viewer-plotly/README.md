# @perspective-dev/viewer-plotly

A [Perspective](https://github.com/perspective-dev/perspective) plugin that uses
[Plotly.js](https://plotly.com/javascript/) to render interactive charts inside
`<perspective-viewer>`.

## Supported Chart Types

| Plugin Name    | Plotly Trace Type        | Category     | Description                       |
| -------------- | ------------------------ | ------------ | --------------------------------- |
| Plotly Bar     | `bar`                    | Y Chart      | Grouped bar chart                 |
| Plotly Line    | `scatter` (mode: lines)  | Y Chart      | Line chart                        |
| Plotly Scatter | `scatter` (mode: markers)| XY Chart     | Scatter plot (requires 2 columns) |
| Plotly Pie     | `pie`                    | Hierarchical | Pie chart                         |

## Installation

```bash
pnpm add @perspective-dev/viewer-plotly
```

## Usage

### ESM (all chart types)

```javascript
import "@perspective-dev/viewer-plotly";
```

### ESM (individual chart types, for tree-shaking)

```javascript
import "@perspective-dev/viewer-plotly/bar";
import "@perspective-dev/viewer-plotly/line";
import "@perspective-dev/viewer-plotly/scatter";
import "@perspective-dev/viewer-plotly/pie";
```

### CDN

```html
<script src="https://unpkg.com/@perspective-dev/viewer-plotly/dist/cdn/perspective-viewer-plotly.js"></script>
```

### With `<perspective-viewer>`

```html
<perspective-viewer plugin="Plotly Bar"></perspective-viewer>

<script type="module">
    import perspective from "@perspective-dev/client";
    import "@perspective-dev/viewer";
    import "@perspective-dev/viewer-plotly";

    const viewer = document.querySelector("perspective-viewer");
    const client = await perspective.websocket("ws://localhost:8080");
    const table = await client.open_table("my_table");
    viewer.load(table);
</script>
```

## Development

```bash
# Build the package
cd packages/viewer-plotly
pnpm run build

# Clean build artifacts
pnpm run clean
```

## Architecture

This plugin follows the same architecture as `@perspective-dev/viewer-d3fc`:

- Each chart type is a separate custom element registered with
  `<perspective-viewer>` via `registerPlugin()`.
- Data flows from `view.to_columns_string()` through a transformation layer
  (`data/transform.ts`) that converts Perspective column data into Plotly trace
  arrays.
- Charts are rendered using `Plotly.react()` for efficient incremental updates.
- The plugin uses Shadow DOM with adopted stylesheets for style encapsulation.

### Key Files

| File                    | Purpose                                        |
| ----------------------- | ---------------------------------------------- |
| `src/ts/index.ts`       | Entry point; registers all chart plugins        |
| `src/ts/plugin/plugin.ts` | Custom element class and registration logic  |
| `src/ts/charts/*.ts`    | Individual chart implementations                |
| `src/ts/data/transform.ts` | Perspective data to Plotly trace conversion |
| `src/ts/types.ts`       | TypeScript interfaces                           |
| `src/less/chart.less`   | Container and theme-integration styles          |

## License

Apache License 2.0
