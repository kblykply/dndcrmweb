import type { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { FinanceReport, ReportCell, ReportColumn } from "./model";

function display(value: ReportCell, column: ReportColumn, tr: boolean) {
  if (value === null) return "—";
  if (typeof value !== "number") return value;
  return new Intl.NumberFormat(
    tr ? "tr-TR" : "en-GB",
    column.kind === "count"
      ? { maximumFractionDigits: 0 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  ).format(value);
}

/** Customer-facing statement: continuous tables, repeated identity and explicit arrears. */
export function renderAccountPdf(
  doc: jsPDF,
  report: FinanceReport,
  tr: boolean,
) {
  const presentation = report.pdf!;
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 12,
    usable = width - margin * 2;
  const ink: [number, number, number] = [23, 38, 56];
  const red: [number, number, number] = [163, 31, 43];
  const headingLines = doc
    .setFont("NotoSans", "bold")
    .setFontSize(12)
    .splitTextToSize(presentation.subtitle, usable - 28) as string[];
  doc.setFont("NotoSans", "normal").setFontSize(9);
  const detailLines = presentation.details.flatMap(
    (line) => doc.splitTextToSize(line, usable) as string[],
  );
  const top = 26 + headingLines.length * 5 + detailLines.length * 4.5 + 7;
  const noteLines = doc
    .setFontSize(8)
    .splitTextToSize(presentation.note, usable) as string[];
  const bottom = 14 + noteLines.length * 3.8;
  let y = top;
  report.sheets.forEach((part) => {
    // Keep a section heading with its column header and at least one row.
    if (y + 28 > height - bottom) {
      doc.addPage();
      y = top;
    }
    doc
      .setFont("NotoSans", "bold")
      .setFontSize(10)
      .setTextColor(...ink);
    doc.text(part.name, margin, y);
    const columns = part.columns
      .map((column, original) => ({ column, original }))
      .filter(({ column }) => !column.pdfHidden);
    const fixed = columns.reduce(
      (sum, { column }) => sum + (column.pdfWidth || 0),
      0,
    );
    const flexible = columns.filter(({ column }) => !column.pdfWidth).length;
    const rowIndexes = new Set(part.overdueRows || []);
    const highlights = new Set(part.overdueColumns || []);
    autoTable(doc, {
      startY: y + 4,
      margin: { top, bottom, left: margin, right: margin },
      tableWidth: usable,
      head: [columns.map(({ column }) => column.label)],
      body: part.rows.length
        ? part.rows.map((row) =>
            columns.map(({ column, original }) =>
              display(row[original], column, tr),
            ),
          )
        : [
            columns.map((_, index) =>
              index === 0
                ? tr
                  ? "Bu dönemde kayıt yok."
                  : "No records in this period."
                : "",
            ),
          ],
      styles: {
        font: "NotoSans",
        fontSize: 9,
        cellPadding: 2.5,
        overflow: "linebreak",
        textColor: ink,
        valign: "middle",
        lineColor: [222, 230, 235],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [23, 91, 103],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [246, 249, 251] },
      rowPageBreak: "avoid",
      showHead: "everyPage",
      columnStyles: Object.fromEntries(
        columns.map(({ column }, index) => [
          index,
          {
            halign: column.kind ? "right" : "left",
            cellWidth: column.pdfWidth || (usable - fixed) / flexible,
          },
        ]),
      ),
      didParseCell: (cell) => {
        if (cell.section !== "body" || !part.rows.length) return;
        const original = columns[cell.column.index].original;
        const value = part.rows[cell.row.index][original];
        if (rowIndexes.has(cell.row.index))
          cell.cell.styles.fillColor = [255, 239, 240];
        if (
          highlights.has(original) &&
          (rowIndexes.has(cell.row.index) ||
            (typeof value === "number" && value > 0))
        ) {
          cell.cell.styles.textColor = red;
          cell.cell.styles.fontStyle = "bold";
        }
      },
    });
    y =
      (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 10;
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont("NotoSans", "bold").setTextColor(23, 91, 103).setFontSize(15);
    doc.text(report.title, margin, 16);
    doc.setTextColor(...ink).setFontSize(12);
    doc.text(headingLines, margin, 25, { lineHeightFactor: 1.18 });
    doc.setFont("NotoSans", "normal").setFontSize(9);
    detailLines.forEach((line, index) =>
      doc.text(line, margin, 27 + headingLines.length * 5 + index * 4.5),
    );
    doc.setFont("NotoSans", "bold").setFontSize(12).setTextColor(23, 91, 103);
    doc.text("DND", width - margin, 25, { align: "right" });
    doc
      .setDrawColor(210, 223, 229)
      .line(margin, top - 4, width - margin, top - 4);
    doc.line(margin, height - bottom + 4, width - margin, height - bottom + 4);
    doc.setFont("NotoSans", "normal").setFontSize(8).setTextColor(65, 78, 90);
    noteLines.forEach((line, index) =>
      doc.text(line, margin, height - bottom + 9 + index * 3.8),
    );
    doc.text(`DND CRM · ${page} / ${pages}`, width - margin, height - 5, {
      align: "right",
    });
  }
}
