import dayjs from "dayjs";

export type PdfSection = {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  accentRgb: [number, number, number];
};

export async function exportToPdf(
  sections: PdfSection[],
  dateFrom: string,
  dateTo: string,
  filename: string
) {
  const jsPDF = (await import("jspdf")).default;
  const { autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(232, 86, 106);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("MomCare — Health Report", 14, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Period: ${dateFrom} to ${dateTo}`, 14, 19);
  doc.text(`Generated: ${dayjs().format("DD MMM YYYY, hh:mm A")}`, 14, 24);

  let y = 36;

  for (const section of sections) {
    if (section.rows.length === 0) continue;

    const [r, g, b] = section.accentRgb;

    // Section heading
    doc.setFillColor(r, g, b);
    doc.roundedRect(14, y - 5, pageW - 28, 9, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(section.title, 18, y + 0.5);
    y += 8;

    // Use named autoTable function (jspdf-autotable v5 API)
    autoTable(doc, {
      head: [section.headers],
      body: section.rows,
      startY: y,
      margin: { left: 14, right: 14 },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        font: "helvetica",
        textColor: [30, 30, 46],
        lineColor: [230, 230, 230],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [r, g, b],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [250, 250, 252] },
      tableLineColor: [220, 220, 220],
      tableLineWidth: 0.2,
    });

    // @ts-ignore — finalY is set by autoTable after render
    y = (doc as any).lastAutoTable.finalY + 12;

    if (y > 260) {
      doc.addPage();
      y = 20;
    }
  }

  // Footer on every page
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text("MomCare Health Tracker — made with ❤️ for Mom", 14, 290);
    doc.text(`Page ${i} of ${totalPages}`, pageW - 14, 290, { align: "right" });
  }

  doc.save(filename);
}