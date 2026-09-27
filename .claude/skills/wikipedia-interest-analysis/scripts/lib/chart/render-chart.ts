import * as vega from 'vega';
import { compile, type TopLevelSpec } from 'vega-lite';
import type { AnalysisResult } from '../../types/analysis-result.ts';
import type { ChartMode } from '../../types/chart-mode.ts';
import type { ChartRow } from '../../types/chart-row.ts';

// Must match a font registered in render-pdf.ts, otherwise the SVG embedded in the PDF falls back to a font without Cyrillic.
const FONT = 'Roboto';

/**
 * Monthly line chart. 'share' = views per million human views of the edition (comparable across languages).
 * 'index' = the first full month of each series = 100 (compares growth shape when levels differ a lot).
 */
export async function renderChart(result: AnalysisResult, mode: ChartMode = 'share'): Promise<string> {
  const rows: ChartRow[] = [];

  for (const series of result.series) {
    if (series.status !== 'ok') {
      continue;
    }

    const points = series.monthly.filter((point) => point.perMillion !== null);
    const firstValue = points[0]?.perMillion ?? 0;

    for (const point of points) {
      const indexValue = firstValue > 0 ? (point.perMillion! / firstValue) * 100 : 0;
      const value = mode === 'share' ? point.perMillion! : indexValue;
      rows.push({ month: `${point.month}-01`, series: series.label, value: Math.round(value * 100) / 100 });
    }
  }

  const spec: TopLevelSpec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    width: 480,
    height: 200,
    background: 'white',
    data: { values: rows },
    mark: { type: 'line', point: { size: 12 }, strokeWidth: 2 },
    encoding: {
      x: { field: 'month', type: 'temporal', timeUnit: 'yearmonth', title: null, axis: { format: '%b %Y', labelAngle: 0, tickCount: 6 } },
      y: {
        field: 'value',
        type: 'quantitative',
        title: mode === 'share' ? 'Views per 1M edition views' : 'Index (first month = 100)',
      },
      color: { field: 'series', type: 'nominal', title: null, legend: { orient: 'bottom', columns: 2, labelLimit: 240 } },
    },
    config: {
      font: FONT,
      view: { stroke: null },
      axis: { labelFontSize: 9, titleFontSize: 9, gridColor: '#e5e7eb' },
      legend: { labelFontSize: 9 },
    },
  };
  const view = new vega.View(vega.parse(compile(spec).spec), { renderer: 'none' });
  const svg = await view.toSVG();
  view.finalize();

  return svg;
}
