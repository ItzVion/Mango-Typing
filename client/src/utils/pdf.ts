import { jsPDF } from "jspdf";

type Sheet = { title: string; topic: string; content: string; difficulty?: "easy" | "medium" | "hard" };

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function renderSheetHeader(doc: jsPDF, margin: number, testNumber: number, difficulty: string) {
  let y = margin;
  doc.setTextColor(0, 0, 0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("VC TYPING", margin, y);
  y += 22;

  doc.setFontSize(20);
  doc.text(`Typing Test ${testNumber} ${capitalize(difficulty)}`, margin, y);
  y += 28;

  return y;
}

function renderSheet(doc: jsPDF, sheet: Sheet, testNumber: number) {
  const margin = 50;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const y = renderSheetHeader(doc, margin, testNumber, sheet.difficulty || "easy");

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  const contentStartY = y;
  const availableHeight = pageHeight - margin - contentStartY;
  const textWidth = pageWidth - margin * 2;

  // Auto-fit: find the largest font size (within a sane range) whose
  // wrapped line count still fits on this one page, so a short sheet fills
  // the page with bigger, easier-to-read type instead of leaving the
  // bottom half blank, and a long sheet shrinks just enough to still fit
  // on a single page rather than spilling onto a second one.
  let fontSize = 20;
  let lines: string[] = [];
  let lineHeight = 0;
  for (let size = 20; size >= 10; size -= 0.5) {
    doc.setFontSize(size);
    const candidateLines = doc.splitTextToSize(sheet.content, textWidth);
    const candidateLineHeight = size * 1.55;
    if (candidateLines.length * candidateLineHeight <= availableHeight) {
      fontSize = size;
      lines = candidateLines;
      lineHeight = candidateLineHeight;
      break;
    }
    fontSize = size;
    lines = candidateLines;
    lineHeight = candidateLineHeight;
  }

  doc.setFontSize(fontSize);
  let lineY = contentStartY;
  for (const line of lines) {
    if (lineY > pageHeight - margin) {
      doc.addPage();
      lineY = margin;
    }
    doc.text(line, margin, lineY);
    lineY += lineHeight;
  }
}

function renderCategoryDivider(doc: jsPDF, label: string) {
  const margin = 50;
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("VC TYPING", margin, margin);
  doc.setFontSize(28);
  doc.text(label, margin, pageHeight / 2);
}

export function downloadSheetPdf(sheet: Sheet & { testNumber?: number }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  renderSheet(doc, sheet, sheet.testNumber ?? 1);
  doc.save(`VC-Typing-${capitalize(sheet.difficulty || "easy")}-${sheet.testNumber ?? 1}.pdf`);
}

// Combined PDF, grouped by difficulty: a divider page labeled Easy/Medium/Hard,
// then one page per sheet in that group, numbered 1-5 within the group.
export function downloadAllSheetsPdf(sheets: Sheet[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const order: Array<"easy" | "medium" | "hard"> = ["easy", "medium", "hard"];
  let firstPage = true;

  for (const difficulty of order) {
    const group = sheets.filter((s) => (s.difficulty || "easy") === difficulty);
    if (group.length === 0) continue;

    if (!firstPage) doc.addPage();
    firstPage = false;
    renderCategoryDivider(doc, capitalize(difficulty));

    group.forEach((s, i) => {
      doc.addPage();
      renderSheet(doc, s, i + 1);
    });
  }

  doc.save("VC-Typing-All-Sheets.pdf");
}
