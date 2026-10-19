import type {
  FinanceReport,
  ReportCell,
  ReportFormat,
  ReportColumn,
} from "./model";

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
function text(value: ReportCell, column: ReportColumn, tr: boolean) {
  if (value === null) return "—";
  if (typeof value !== "number") return value;
  return new Intl.NumberFormat(
    tr ? "tr-TR" : "en-GB",
    column.kind === "percent"
      ? { style: "percent", maximumFractionDigits: 1 }
      : column.kind === "count"
        ? { maximumFractionDigits: 0 }
        : { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  ).format(value);
}
let fonts: Promise<string[]> | undefined;
function loadFonts() {
  return (fonts ??= Promise.all(
    ["Regular", "Bold"].map(async (weight) => {
      const response = await fetch(`/fonts/report/NotoSans-${weight}.ttf`);
      if (!response.ok) throw new Error("PDF font could not be loaded");
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192)
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return btoa(binary);
    }),
  ).catch((error) => {
    fonts = undefined;
    throw error;
  }));
}
export async function downloadFinanceReport(
  report: FinanceReport,
  format: ReportFormat,
  tr: boolean,
  allowed: () => boolean,
) {
  const check = () => {
    if (!allowed())
      throw new Error(
        tr
          ? "Oturum değişti. Raporu yeniden hazırlayın."
          : "Your session changed. Prepare the report again.",
      );
  };
  check();
  if (format === "xlsx") {
    const { Workbook } = await import("exceljs");
    const book = new Workbook();
    book.creator = "DND CRM";
    book.created = new Date();
    for (const part of report.sheets) {
      const sheet = book.addWorksheet(part.name.slice(0, 31));
      sheet.addRow([report.title]);
      sheet.getRow(1).font = {
        name: "Calibri",
        size: 16,
        bold: true,
        color: { argb: "FF173C37" },
      };
      for (const line of report.metadata) sheet.addRow([line]);
      sheet.addRow([]);
      const header = sheet.addRow(part.columns.map((column) => column.label));
      header.font = { bold: true, color: { argb: "FFFFFFFF" } };
      header.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF176F78" },
      };
      for (const values of part.rows) sheet.addRow(values);
      part.columns.forEach((column, index) => {
        const col = sheet.getColumn(index + 1);
        col.width = column.width ?? (column.kind ? 20 : 28);
        col.alignment = {
          vertical: "middle",
          horizontal: column.kind ? "right" : "left",
        };
        if (column.kind)
          col.numFmt =
            column.kind === "percent"
              ? "0.0%"
              : column.kind === "count"
                ? "#,##0"
                : "#,##0.00";
      });
      sheet.views = [{ state: "frozen", ySplit: header.number }];
      sheet.autoFilter = {
        from: { row: header.number, column: 1 },
        to: { row: header.number, column: part.columns.length },
      };
      sheet.pageSetup = {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9,
      };
      sheet.pageSetup.printTitlesRow = `${header.number}:${header.number}`;
      sheet.headerFooter.oddFooter = "&L DND CRM &R &P / &N";
    }
    const buffer = await book.xlsx.writeBuffer();
    check();
    save(
      new Blob([new Uint8Array(buffer)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `${report.filename}.xlsx`,
    );
    return;
  }
  const [{ jsPDF }, { default: autoTable }, loadedFonts] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    loadFonts(),
  ]);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  ["normal", "bold"].forEach((style, index) => {
    const name = `NotoSans-${style}.ttf`;
    doc.addFileToVFS(name, loadedFonts[index]);
    doc.addFont(name, "NotoSans", style);
  });
  if (report.pdf) {
    const { renderAccountPdf } = await import("./account-pdf");
    renderAccountPdf(doc, report, tr);
    check();
    doc.save(`${report.filename}.pdf`);
    return;
  }
  report.sheets.forEach((part, index) => {
    if (index) doc.addPage();
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(15);
    doc.setTextColor(23, 60, 55);
    doc.text(report.title, 12, 15);
    doc.setFontSize(11);
    doc.text(part.name, 12, 23);
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);
    let y = 29;
    for (const line of report.metadata) {
      const lines = doc.splitTextToSize(line, 270);
      doc.text(lines, 12, y);
      y += lines.length * 4;
    }
    autoTable(doc, {
      startY: y + 3,
      margin: { left: 12, right: 12, top: 16, bottom: 14 },
      head: [part.columns.map((column) => column.label)],
      body: part.rows.map((values) =>
        values.map((value, i) => text(value, part.columns[i], tr)),
      ),
      styles: {
        font: "NotoSans",
        fontSize: part.columns.length > 10 ? 7 : 8,
        cellPadding: 2.2,
        overflow: "linebreak",
        textColor: [23, 38, 56],
      },
      headStyles: { fillColor: [23, 111, 120], fontStyle: "bold" },
      columnStyles: Object.fromEntries(
        part.columns.map((column, i) => [
          i,
          { halign: column.kind ? "right" : "left" },
        ]),
      ),
      alternateRowStyles: { fillColor: [245, 248, 250] },
    });
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(8);
    doc.setTextColor(70, 80, 90);
    doc.text(`DND CRM · ${page} / ${pages}`, 285, 204, { align: "right" });
  }
  check();
  doc.save(`${report.filename}.pdf`);
}
