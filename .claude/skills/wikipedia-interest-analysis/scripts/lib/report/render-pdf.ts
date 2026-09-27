import { createWriteStream } from 'node:fs';
import { createRequire } from 'node:module';
import type { AnalysisResult } from '../../types/analysis-result.ts';
import type { ReportText } from '../../types/report-text.ts';
import type { SeriesResult } from '../../types/series-result.ts';
import { formatSignedPercent } from '../analyze/format-signed-percent.ts';

const require = createRequire(import.meta.url);
// pdfmake 0.2 server-side printer is CommonJS. Roboto from its bundled VFS covers Latin Extended + Cyrillic.
const PdfPrinter = require('pdfmake/src/printer');
const vfs: Record<string, string> = require('pdfmake/build/vfs_fonts.js');

function fontFile(fileName: string): Buffer {
  return Buffer.from(vfs[fileName], 'base64');
}

const FONTS = {
  Roboto: {
    normal: fontFile('Roboto-Regular.ttf'),
    bold: fontFile('Roboto-Medium.ttf'),
    italics: fontFile('Roboto-Italic.ttf'),
    bolditalics: fontFile('Roboto-MediumItalic.ttf'),
  },
};

const LIMITATIONS = [
  'Pageviews measure curiosity, not willingness to pay. Use them to choose what to validate next, not as proof of demand.',
  'Language edition ≠ country: English Wikipedia is read worldwide, and many people read an edition other than their native language.',
  'Only human traffic (agent=user) is counted; some undetected bots may remain. Views of redirect titles are not included.',
  'Share = article views / all human views of the same edition. This corrects for the overall decline in Wikipedia traffic.',
];

function tableRow(series: SeriesResult): string[] {
  const metrics = series.metrics;

  if (series.status !== 'ok' || !metrics) {
    return [series.label, series.status === 'no_article' ? 'no article' : 'no data', '—', '—', '—', '—'];
  }

  return [
    series.label,
    series.direction ?? '—',
    metrics.avgMonthlyViews.toLocaleString('en'),
    formatSignedPercent(metrics.yoyShareRobustPct, '—'),
    formatSignedPercent(metrics.trendPctPerYear, '—'),
    series.confidence ?? '—',
  ];
}

function buildDocument(result: AnalysisResult, svg: string, text: ReportText, compact: boolean) {
  const rows = result.series.slice(0, 10).map(tableRow);
  const reasons = result.series.flatMap((series) => series.reasons.map((reason) => `${series.label}: ${reason}`)).slice(0, compact ? 3 : 4);

  return {
    pageSize: 'A4',
    pageMargins: compact ? [32, 26, 32, 26] : [36, 32, 36, 32],
    defaultStyle: { font: 'Roboto', fontSize: compact ? 7.5 : 8.5, lineHeight: compact ? 1.1 : 1.15 },
    styles: {
      h1: { fontSize: 16, bold: true, margin: [0, 0, 0, 2] },
      h2: { fontSize: compact ? 9 : 10, bold: true, margin: compact ? [0, 5, 0, 2] : [0, 8, 0, 3], color: '#1f2937' },
      muted: { color: '#6b7280', fontSize: compact ? 7 : 8 },
    },
    content: [
      { text: text.title, style: 'h1' },
      { text: `Wikipedia pageviews · ${result.period.start} – ${result.period.end} (${result.period.months} months) · generated ${result.generatedAt.slice(0, 10)}`, style: 'muted' },
      { text: [{ text: 'Question: ', bold: true }, text.question], margin: [0, 6, 0, 0] },
      { text: 'Takeaway', style: 'h2' },
      { text: text.takeaway, fontSize: 9.5 },
      { svg, width: compact ? 400 : 523, alignment: 'center', margin: [0, compact ? 4 : 8, 0, 0] },
      { text: 'Key metrics', style: 'h2' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body: [['Series', 'Direction', 'Views / month', 'Share YoY*', 'Trend / year', 'Confidence'].map((header) => ({ text: header, bold: true })), ...rows],
        },
        layout: 'lightHorizontalLines',
      },
      { text: "* Change in the share of the edition's human views, last 12 vs previous 12 months, spike days replaced by the local median.", style: 'muted', margin: [0, 2, 0, 0] },
      ...(result.ranking.length
        ? [{ text: 'Ranking (growth × size × confidence)', style: 'h2' }, { text: result.ranking.slice(0, 5).map((row, index) => `${index + 1}. ${row.label} — ${row.score}/100`).join('    ') }]
        : []),
      ...(reasons.length ? [{ text: 'Why confidence is not higher', style: 'h2' }, { ul: reasons }] : []),
      { text: 'Assumptions & limitations', style: 'h2' },
      { ul: LIMITATIONS, style: 'muted' },
      { text: 'Source: Wikimedia Pageviews API (agent=user, all-access). Trend: Theil–Sen slope on log share; significance: Mann–Kendall test.', style: 'muted', margin: [0, 6, 0, 0] },
    ],
  };
}

/** Writes a one-page PDF report and returns the number of pages it took. */
export async function renderPdf(result: AnalysisResult, svg: string, text: ReportText, outFile: string): Promise<number> {
  const printer = new PdfPrinter(FONTS);
  // pdfmake lays out the whole document up front and keeps the page list, so overflow is known before writing.
  const layout = (compact: boolean) => {
    const pdfDocument = printer.createPdfKitDocument(buildDocument(result, svg, text, compact));

    return { pdfDocument, pages: (pdfDocument._pdfMakePages?.length ?? 1) as number };
  };
  let rendered = layout(false);

  if (rendered.pages > 1) {
    // Many series: shrink the chart and type before giving up.
    rendered = layout(true);
  }

  await new Promise<void>((finish, fail) => {
    const stream = createWriteStream(outFile);
    stream.on('finish', finish);
    stream.on('error', fail);
    rendered.pdfDocument.pipe(stream);
    rendered.pdfDocument.end();
  });

  return rendered.pages;
}
