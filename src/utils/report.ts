import type { jsPDF } from 'jspdf';
import type { RowInput } from 'jspdf-autotable';
import type { ResumeAnalysis } from '../App';

// Header logos
const LOGO_WINGMAN_URL = 'logos/nexocean-mascot.png';
const LOGO_NEXO_URL = 'logo/varuna-logo.png';
// Certification badge (shown when overallScore >= 80)
const LOGO_CERT_URL = 'logos/wingman_certified_logo.png';

type LogoImage = { data: string; w: number; h: number };
type HeaderOpts = { candidateName?: string; overallScore?: number; etaMinutesMin?: number; etaMinutesMax?: number };
let cachedLogos: { wingman?: LogoImage; nexo?: LogoImage; cert?: LogoImage } | null = null;
let projectFontLoaded = false;

function resolvePublicUrl(path: string): string {
  try {
    const baseTag = (document.querySelector('base') as HTMLBaseElement | null)?.href;
    if (baseTag) return new URL(path, baseTag).toString();
  } catch {}
  try {
    // Vite sets BASE_URL; fall back to current origin
    const base = (import.meta as any)?.env?.BASE_URL || '/';
    return new URL(path, window.location.origin + base).toString();
  } catch {
    return path;
  }
}

async function loadImageAsDataURL(src: string, maxW = 2400, maxH = 1200): Promise<LogoImage | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const natW = img.naturalWidth || img.width;
        const natH = img.naturalHeight || img.height;
        const scale = Math.min(1, Math.min(maxW / natW, maxH / natH));
        const outW = Math.max(1, Math.round(natW * scale));
        const outH = Math.max(1, Math.round(natH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, outW, outH);
        const data = canvas.toDataURL('image/png');
        resolve({ data, w: outW, h: outH });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    // Cache-bust per session to pick up asset changes
    const url = new URL(src, window.location.href);
    if (!url.searchParams.has('v')) url.searchParams.set('v', String(Date.now()));
    img.src = url.toString();
  });
}

async function getLogos(): Promise<{ wingman?: LogoImage; nexo?: LogoImage; cert?: LogoImage }> {
  if (cachedLogos) return cachedLogos;
  const wingmanUrl = LOGO_WINGMAN_URL ? resolvePublicUrl(LOGO_WINGMAN_URL) : '';
  const nexoUrl = LOGO_NEXO_URL ? resolvePublicUrl(LOGO_NEXO_URL) : '';
  const certUrl = LOGO_CERT_URL ? resolvePublicUrl(LOGO_CERT_URL) : '';
  const loaders: Promise<LogoImage | null>[] = [];
  if (wingmanUrl) loaders.push(loadImageAsDataURL(wingmanUrl)); else loaders.push(Promise.resolve(null));
  if (nexoUrl) loaders.push(loadImageAsDataURL(nexoUrl)); else loaders.push(Promise.resolve(null));
  if (certUrl) loaders.push(loadImageAsDataURL(certUrl)); else loaders.push(Promise.resolve(null));
  const [wingman, nexo, cert] = await Promise.all(loaders);
  cachedLogos = { wingman: wingman || undefined, nexo: nexo || undefined, cert: cert || undefined };
  if (!cachedLogos.wingman) {
    try { console.warn('[Varuna PDF] Wingman logo not found or failed to load:', wingmanUrl); } catch {}
  }
  return cachedLogos;
}

async function tryLoadProjectFont(doc: any) {
  if (projectFontLoaded) return true;
  try {
    const load = async (path: string, name: string, style: 'normal' | 'bold') => {
      const res = await fetch(path);
      if (!res.ok) return false;
      const buf = await res.arrayBuffer();
      const b64 = arrayBufferToBase64(buf);
      doc.addFileToVFS(name, b64);
      doc.addFont(name, 'Satoshi', style);
      return true;
    };
    // Try regular + bold if available in public/fonts
    const ok1 = await load('/fonts/Satoshi-Regular.ttf', 'Satoshi-Regular.ttf', 'normal');
    const ok2 = await load('/fonts/Satoshi-Bold.ttf', 'Satoshi-Bold.ttf', 'bold');
    projectFontLoaded = !!(ok1 || ok2);
    return projectFontLoaded;
  } catch {
    return false;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as number[]);
  }
  return btoa(binary);
}

function drawHeaderLogos(
  doc: any,
  pageWidth: number,
  opts: { wingman?: LogoImage; nexo?: LogoImage; cert?: LogoImage },
  y = 10,
  marginX = 40,
  maxHeight = 44,
  maxWidth = 260
) {
  const draw = (img?: LogoImage, x?: number, alignRight = false) => {
    if (!img) return;
    try {
      const ratio = img.w > 0 && img.h > 0 ? img.w / img.h : 1;
      let w = maxHeight * ratio;
      let h = maxHeight;
      if (w > maxWidth) {
        const scale = maxWidth / w;
        w = w * scale;
        h = h * scale;
      }
      const xPos = alignRight ? pageWidth - marginX - w : (x ?? marginX);
      doc.addImage(img.data, 'PNG', xPos, y, w, h, undefined, 'FAST');
    } catch {}
  };
  draw(opts.wingman, marginX, false);
  draw(opts.nexo, undefined, true);
}

function drawPageHeader(
  doc: any,
  pageWidth: number,
  logos: { wingman?: LogoImage; nexo?: LogoImage; cert?: LogoImage },
  header?: HeaderOpts,
  marginX = 24
) {
  try {
    doc.setFillColor(245, 248, 254);
    doc.rect(0, 0, pageWidth, 48, 'F');
  } catch {}
  drawHeaderLogos(doc, pageWidth, logos, 6, marginX, 32, Math.min(0.30 * (pageWidth - marginX * 2), 220));
  // If score >= 80, stamp the Wingman Certified badge in the header (top-right)
  try {
    const score = header?.overallScore;
    if (typeof score === 'number' && score >= 80 && logos.cert) {
      const img = logos.cert;
      const ratio = img.w > 0 && img.h > 0 ? img.w / img.h : 1;
      const maxH = 28;
      const maxW = 120;
      let w = maxH * ratio;
      let h = maxH;
      if (w > maxW) { const s = maxW / w; w *= s; h *= s; }
      const x = pageWidth - marginX - w;
      const y = 8;
      (doc as any).addImage(img.data, 'PNG', x, y, w, h, undefined, 'FAST');
    }
  } catch {}
  if (header?.candidateName) {
    try {
      doc.setFont(projectFontLoaded ? 'Satoshi' : 'helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(17, 24, 39);
      doc.text(header.candidateName, pageWidth / 2, 22, { align: 'center' });
    } catch {}
  }
  if (typeof header?.overallScore === 'number') {
    const score = header.overallScore;
    const label = `${score}/100`;
    const pillW = 58;
    const pillH = 16;
    const cx = pageWidth / 2;
    const y = 30;
    const x = cx - pillW / 2;
    try {
      const color = score >= 80 ? [22, 163, 74] : score >= 60 ? [217, 119, 6] : [220, 38, 38];
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(x, y, pillW, pillH, 8, 8, 'F');
      doc.setTextColor((color as any)[0], (color as any)[1], (color as any)[2]);
      doc.setFont(projectFontLoaded ? 'Satoshi' : 'helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(label, cx, y + 11, { align: 'center' });
    } catch {}
  }
  if (typeof header?.etaMinutesMin === 'number' && typeof header?.etaMinutesMax === 'number') {
    try {
      const label = `Estimated: ${header.etaMinutesMin}–${header.etaMinutesMax} min`;
      doc.setFont(projectFontLoaded ? 'Satoshi' : 'helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(label, marginX, 44);
    } catch {}
  }
}

export async function generateReportPDF(analysis: ResumeAnalysis, header?: HeaderOpts) {
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 40;
    let cursorY = 60;
    const logos = await getLogos();
    await tryLoadProjectFont(doc);

    // Header
    // Ensure overallScore is available to header for certification badge
    const hdr: HeaderOpts = { ...header, overallScore: header?.overallScore ?? analysis.overallScore };
    drawPageHeader(doc, pageWidth, logos, hdr, marginX);
    doc.setTextColor(34, 49, 89);
    doc.setFont(projectFontLoaded ? 'Satoshi' : 'helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Varuna Resume Analysis', marginX, 54);
    doc.setFont(projectFontLoaded ? 'Satoshi' : 'helvetica', 'normal');
    doc.setFontSize(10);
    const ts = new Date().toLocaleString();
    doc.text(`Generated: ${ts}`, pageWidth - marginX, 54, { align: 'right' });

    // Overall score
    cursorY = 100;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(17, 24, 39);
    doc.text('Overall Score', marginX, cursorY);
    doc.setFontSize(36);
    doc.setTextColor(scoreColor(analysis.overallScore));
    doc.text(String(analysis.overallScore), marginX, cursorY + 40);
    // Progress bar
    const barX = marginX + 70;
    const barY = cursorY + 22;
    const barW = pageWidth - marginX * 2 - 90;
    const barH = 12;
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(barX, barY, barW, barH, 6, 6, 'F');
    const filledW = Math.max(1, Math.min(barW, (analysis.overallScore / 100) * barW));
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(barX, barY, filledW, barH, 6, 6, 'F');
    cursorY += 60;

    // Section scores summary
    const sectionRows: RowInput[] = Object.entries(analysis.sections).map(([name, data]) => [
      capitalize(name),
      `${data.score}/100`,
      (data.suggestions || []).slice(0, 5).join('\n')
    ]);

    try {
      const { default: autoTable } = await import('jspdf-autotable');
      autoTable(doc as any, {
        startY: cursorY,
        head: [['Section', 'Score', 'Top Suggestions']],
        body: sectionRows,
        styles: { fontSize: 10, cellPadding: 6, valign: 'top' },
        headStyles: { fillColor: [37, 99, 235], textColor: 255 },
        columnStyles: { 1: { halign: 'center', cellWidth: 70 } },
        theme: 'striped',
      });
      const lastY = (doc as any).lastAutoTable?.finalY;
      cursorY = (lastY ?? cursorY) + 24;
    } catch (tblErr) {
      // Fallback: draw a simple listing without the plugin
      console.warn('autoTable failed, listing summary instead', tblErr);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Section Scores (Summary)', marginX, cursorY);
      cursorY += 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      Object.entries(analysis.sections).forEach(([name, data]) => {
        ensureRoom(18);
        doc.text(`${capitalize(name)} — ${data.score}/100`, marginX, cursorY);
        cursorY += 14;
        const top = (data.suggestions || []).slice(0, 5);
        top.forEach((it) => {
          const lines = doc.splitTextToSize(`• ${it}`, pageWidth - marginX * 2);
          ensureRoom(14 + (lines.length - 1) * 12);
          doc.text(lines, marginX + 12, cursorY);
          cursorY += 12 + (lines.length - 1) * 12;
        });
        cursorY += 6;
      });
      cursorY += 10;
    }

    // Helper to add list blocks
    const addListBlock = (title: string, items: string[]) => {
      if (!items || items.length === 0) return;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(17, 24, 39);
      ensureRoom(24);
      doc.text(title, marginX, cursorY);
      cursorY += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);
      const maxWidth = pageWidth - marginX * 2;
      items.forEach((it) => {
        const lines = doc.splitTextToSize(`• ${it}`, maxWidth);
        const h = 16 + (lines.length - 1) * 12;
        ensureRoom(h);
        doc.text(lines, marginX, cursorY + 14);
        cursorY += h;
      });
      cursorY += 8;
    };

    addListBlock('Key Strengths', analysis.keyStrengths);
    addListBlock('Critical Improvements', analysis.criticalImprovements);
    addListBlock('ATS Optimization', analysis.atsOptimization);
    addListBlock('Industry-Specific Tips', analysis.industrySpecific);

    // Detailed recommendations by section (all suggestions)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(17, 24, 39);
    ensureRoom(28);
    doc.text('Detailed Recommendations by Section', marginX, cursorY);
    cursorY += 12;
    Object.entries(analysis.sections).forEach(([name, data]) => {
      const title = `${capitalize(name)} (${data.score}/100)`;
      addListBlock(title, data.suggestions || []);
    });

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 30;
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text('Generated by Varuna (Wingman · Nexocean)', marginX, footerY);

    doc.save('varuna-resume-analysis.pdf');

    function ensureRoom(blockHeight: number) {
      const limit = doc.internal.pageSize.getHeight() - 60;
      if (cursorY + blockHeight > limit) {
        doc.addPage();
        cursorY = 60;
      }
    }

    function scoreColor(score: number): [number, number, number] {
      if (score >= 80) return [22, 163, 74];
      if (score >= 60) return [217, 119, 6];
      return [220, 38, 38];
    }

    function capitalize(s: string) {
      return s.charAt(0).toUpperCase() + s.slice(1);
    }
  } catch (err) {
    console.error('PDF: rich layout failed, generating text-only report', err);
    try {
      await generateTextReportPDF(analysis);
    } catch (e) {
      try { downloadReportMarkdown(analysis); } catch {}
    }
  }
}

export function downloadReportMarkdown(analysis: ResumeAnalysis) {
  const content = buildMarkdownReport(analysis);
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'varuna-resume-analysis.md';
  a.click();
  URL.revokeObjectURL(url);
}

function buildMarkdownReport(analysis: ResumeAnalysis): string {
  const lines: string[] = [];
  const ts = new Date().toLocaleString();
  lines.push('# Varuna Resume Analysis');
  lines.push(`_Generated: ${ts}_`);
  lines.push('');
  lines.push('## Overview');
  lines.push(`- Overall Score: ${analysis.overallScore}/100`);
  lines.push('');
  lines.push('## Section Scores');
  Object.entries(analysis.sections).forEach(([name, data]) => {
    lines.push(`### ${capitalize(name)} — ${data.score}/100`);
    (data.suggestions || []).forEach((s) => lines.push(`- ${s}`));
    lines.push('');
  });
  if (analysis.keyStrengths?.length) {
    lines.push('## Key Strengths');
    analysis.keyStrengths.forEach((s) => lines.push(`- ${s}`));
    lines.push('');
  }
  if (analysis.criticalImprovements?.length) {
    lines.push('## Critical Improvements');
    analysis.criticalImprovements.forEach((s) => lines.push(`- ${s}`));
    lines.push('');
  }
  if (analysis.atsOptimization?.length) {
    lines.push('## ATS Optimization');
    analysis.atsOptimization.forEach((s) => lines.push(`- ${s}`));
    lines.push('');
  }
  if (analysis.industrySpecific?.length) {
    lines.push('## Industry-Specific Tips');
    analysis.industrySpecific.forEach((s) => lines.push(`- ${s}`));
    lines.push('');
  }
  return lines.join('\n');

  function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}

// Capture a DOM element (the analysis UI) and save it as a paginated PDF
export async function exportElementAsPDF(
  element: HTMLElement,
  filename = 'varuna-resume-analysis.pdf',
  header?: HeaderOpts
) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 24;
  const logos = await getLogos();

  // Render with higher scale for sharper output
  const captureScale = Math.min(2, window.devicePixelRatio || 1.5);
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: captureScale,
    useCORS: true,
    logging: false,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const imgW = pageW - margin * 2;
  const pdfScale = imgW / canvas.width;
  const headerH = 48; // keep in sync with drawPageHeader
  const topY = headerH + Math.max(8, Math.floor(margin / 2));
  const pageContentH = pageH - topY - margin;
  const slicePxH = Math.floor(pageContentH / pdfScale); // canvas pixels per PDF page

  // Build a list of safe cut positions (canvas pixels) after each export-block bottom
  const containerRect = element.getBoundingClientRect();
  const cssToCanvas = canvas.height / element.scrollHeight;
  const blocks = Array.from(element.querySelectorAll<HTMLElement>('.export-block'));
  const safeCuts: number[] = [0];
  blocks.forEach((el) => {
    const r = el.getBoundingClientRect();
    const bottomCss = (r.bottom - containerRect.top) + (element.scrollTop || 0);
    const y = Math.max(0, Math.round(bottomCss * cssToCanvas));
    if (!Number.isNaN(y)) safeCuts.push(y);
  });
  safeCuts.push(canvas.height);
  safeCuts.sort((a, b) => a - b);

  let rendered = 0;
  let pageIndex = 0;
  while (rendered < canvas.height - 1) {
    // Choose a cut that doesn’t split through an export-block
    const target = rendered + slicePxH;
    let cutAt = safeCuts.filter((y) => y <= target && y > rendered + 48).pop();
    if (!cutAt) {
      // If none available, try the next safe cut after target but cap to canvas height
      cutAt = safeCuts.find((y) => y > target) ?? canvas.height;
    }
    let sliceH = Math.max(48, Math.min(cutAt - rendered, canvas.height - rendered));
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceH;
    const ctx = sliceCanvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    ctx.drawImage(
      canvas,
      0,
      rendered,
      canvas.width,
      sliceH,
      0,
      0,
      canvas.width,
      sliceH
    );

    const imgData = sliceCanvas.toDataURL('image/png');
    let imgH = sliceH * pdfScale;
    if (pageIndex > 0) doc.addPage();
    // Slightly scale up if the slice leaves too much bottom gap
    if (imgH < (pageH - margin * 2) * 0.8) {
      const scaleUp = Math.min(1.08, (pageH - margin * 2) / imgH);
      const w2 = imgW * scaleUp;
      const x = margin + ((pageW - margin * 2) - w2) / 2;
      imgH *= scaleUp;
      doc.addImage(imgData, 'PNG', x, topY, w2, imgH, undefined, 'FAST');
    } else {
      doc.addImage(imgData, 'PNG', margin, topY, imgW, imgH, undefined, 'FAST');
    }
    // Overlay header; include name + score only on first page
    drawPageHeader(doc, pageW, logos, pageIndex === 0 ? header : undefined, margin);
    // Confidential footer above page number
    try {
      doc.setFont(projectFontLoaded ? 'Satoshi' : 'helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      const conf = 'Confidential — For internal review only';
      const twc = doc.getTextWidth(conf);
      doc.text(conf, (pageW - twc) / 2, pageH - 24);
    } catch {}

    rendered += sliceH;
    pageIndex += 1;
  }
  // Page numbers
  try {
    const total = (doc as any).getNumberOfPages();
    doc.setFont(projectFontLoaded ? 'Satoshi' : 'helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    for (let i = 1; i <= total; i++) {
      (doc as any).setPage(i);
      const label = `Page ${i} of ${total}`;
      const tw = doc.getTextWidth(label);
      doc.text(label, (pageW - tw) / 2, pageH - 10);
    }
  } catch {}

  doc.save(filename);
}

// Export with a preface: page 1 contains only the suggestions element (scaled ~80%),
// followed by the full analysis UI starting on page 2 with normal layout and safe page breaks.
export async function exportAnalysisAsPDFTwoPage(
  root: HTMLElement,
  suggestions: HTMLElement,
  filename = 'varuna-resume-analysis.pdf',
  firstPageScale = 0.8,
  header?: HeaderOpts
) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 24;
  const logos = await getLogos();
  const captureScale = Math.min(2, window.devicePixelRatio || 1.5);

  // 1) Suggestions-only first page
  const suggCanvas = await html2canvas(suggestions, {
    backgroundColor: '#ffffff',
    scale: captureScale,
    useCORS: true,
    logging: false,
    windowWidth: suggestions.scrollWidth,
    windowHeight: suggestions.scrollHeight,
  });
  // Target width is 80% of printable area, but ensure it fits vertically too
  let pdfScale = ((pageW - margin * 2) * firstPageScale) / suggCanvas.width;
  pdfScale = Math.min(pdfScale, (pageH - margin * 2) / suggCanvas.height);
  const imgW = suggCanvas.width * pdfScale;
  const imgH = suggCanvas.height * pdfScale;
  const headerH = 48;
  const contentTop = headerH + Math.max(8, Math.floor(margin / 2));
  const x = margin + ((pageW - margin * 2) - imgW) / 2;
  const y = contentTop + ((pageH - contentTop - margin) - imgH) / 2;
  doc.addImage(suggCanvas.toDataURL('image/png'), 'PNG', x, y, imgW, imgH, undefined, 'FAST');
  drawPageHeader(doc, pageW, logos, header, margin);
  // Footer tagline on first page
  try {
    doc.setFont(projectFontLoaded ? 'Satoshi' : 'helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const conf = 'Confidential — For internal review only';
    const twc = doc.getTextWidth(conf);
    doc.text(conf, (pageW - twc) / 2, pageH - 24);
  } catch {}

  // 2) Full analysis starting on page 2 with safe cuts between export blocks
  doc.addPage();
  // Hide elements not desired on the detail pages (suggestions + overall score card)
  const toRestore: Array<{ el: HTMLElement; display: string }> = [];
  const hide = (el: HTMLElement | null) => {
    if (!el) return;
    toRestore.push({ el, display: el.style.display });
    el.style.display = 'none';
  };
  hide(suggestions);
  const firstBlock = root.querySelector('.export-block') as HTMLElement | null;
  hide(firstBlock);

  const fullCanvas = await html2canvas(root, {
    backgroundColor: '#ffffff',
    scale: captureScale,
    useCORS: true,
    logging: false,
    windowWidth: root.scrollWidth,
    windowHeight: root.scrollHeight,
  });
  // Restore hidden nodes
  toRestore.forEach(({ el, display }) => (el.style.display = display));
  const imgW2 = pageW - margin * 2;
  const pdfScale2 = imgW2 / fullCanvas.width;
  const headerH2 = 48;
  const contentTop2 = headerH2 + Math.max(8, Math.floor(margin / 2));
  const pageContentH = pageH - contentTop2 - margin;
  const slicePxH = Math.floor(pageContentH / pdfScale2);

  // Safe cut positions after each export-block bottom
  const containerRect = root.getBoundingClientRect();
  const cssToCanvas = fullCanvas.height / root.scrollHeight;
  const blocks = Array.from(root.querySelectorAll<HTMLElement>('.export-block'));
  const safeCuts: number[] = [0];
  blocks.forEach((el) => {
    const r = el.getBoundingClientRect();
    const bottomCss = (r.bottom - containerRect.top) + (root.scrollTop || 0);
    const yb = Math.max(0, Math.round(bottomCss * cssToCanvas));
    if (!Number.isNaN(yb)) safeCuts.push(yb);
  });
  safeCuts.push(fullCanvas.height);
  safeCuts.sort((a, b) => a - b);

  let rendered = 0;
  let pageIndex = 1; // already on page 2 overall, but for section count start at 1 here
  while (rendered < fullCanvas.height - 1) {
    const target = rendered + slicePxH;
    let cutAt = safeCuts.filter((y) => y <= target && y > rendered + 48).pop();
    if (!cutAt) cutAt = safeCuts.find((y) => y > target) ?? fullCanvas.height;
    const sliceH = Math.max(48, Math.min(cutAt - rendered, fullCanvas.height - rendered));

    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = fullCanvas.width;
    sliceCanvas.height = sliceH;
    const ctx = sliceCanvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    ctx.drawImage(fullCanvas, 0, rendered, fullCanvas.width, sliceH, 0, 0, fullCanvas.width, sliceH);

    const imgData = sliceCanvas.toDataURL('image/png');
    let imgH2 = sliceH * pdfScale2;
    if (pageIndex > 1) doc.addPage();
    if (imgH2 < (pageH - margin * 2) * 0.8) {
      const scaleUp = Math.min(1.08, (pageH - margin * 2) / imgH2);
      const w2 = imgW2 * scaleUp;
      const x2 = margin + ((pageW - margin * 2) - w2) / 2;
      imgH2 *= scaleUp;
      doc.addImage(imgData, 'PNG', x2, contentTop2, w2, imgH2, undefined, 'FAST');
    } else {
      doc.addImage(imgData, 'PNG', margin, contentTop2, imgW2, imgH2, undefined, 'FAST');
    }
    // Header with logos only (no name/score) on pages after the first
    drawPageHeader(doc, pageW, logos, undefined, margin);
    // Footer tagline
    try {
      doc.setFont(projectFontLoaded ? 'Satoshi' : 'helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      const conf = 'Confidential — For internal review only';
      const twc = doc.getTextWidth(conf);
      doc.text(conf, (pageW - twc) / 2, pageH - 24);
    } catch {}

    rendered += sliceH;
    pageIndex += 1;
  }

  // Page numbers
  try {
    const total = (doc as any).getNumberOfPages();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    for (let i = 1; i <= total; i++) {
      (doc as any).setPage(i);
      const label = `Page ${i} of ${total}`;
      const tw = doc.getTextWidth(label);
      doc.text(label, (pageW - tw) / 2, pageH - 10);
    }
  } catch {}

  doc.save(filename);
}

async function generateTextReportPDF(analysis: ResumeAnalysis) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let y = 60;

  const ensure = (h: number) => {
    const limit = doc.internal.pageSize.getHeight() - 60;
    if (y + h > limit) {
      doc.addPage();
      y = 60;
    }
  };

  // Try to draw logos (best-effort only; ignore errors)
  try {
    if (cachedLogos && (cachedLogos.wingman || cachedLogos.nexo)) {
      drawHeaderLogos(
        doc,
        pageW,
        cachedLogos,
        12,
        marginX,
        44,
        Math.min(0.38 * (pageW - marginX * 2), 260)
      );
    }
  } catch {}

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Varuna Resume Analysis', marginX, y);
  y += 24;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Generated: ${new Date().toLocaleString()}`, marginX, y);
  y += 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Overview', marginX, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.text(`Overall Score: ${analysis.overallScore}/100`, marginX, y);
  y += 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Section Scores', marginX, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  Object.entries(analysis.sections).forEach(([name, data]) => {
    ensure(16);
    doc.text(`${capitalize(name)} — ${data.score}/100`, marginX, y);
    y += 14;
    (data.suggestions || []).slice(0, 5).forEach((s) => {
      const lines = doc.splitTextToSize(`• ${s}`, pageW - marginX * 2);
      ensure(12 + (lines.length - 1) * 12);
      doc.text(lines, marginX + 12, y);
      y += 12 + (lines.length - 1) * 12;
    });
    y += 8;
  });

  const addList = (title: string, items: string[]) => {
    if (!items || items.length === 0) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    ensure(18);
    doc.text(title, marginX, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    items.forEach((it) => {
      const lines = doc.splitTextToSize(`• ${it}`, pageW - marginX * 2);
      ensure(12 + (lines.length - 1) * 12);
      doc.text(lines, marginX + 12, y);
      y += 12 + (lines.length - 1) * 12;
    });
    y += 8;
  };

  addList('Key Strengths', analysis.keyStrengths);
  addList('Critical Improvements', analysis.criticalImprovements);
  addList('ATS Optimization', analysis.atsOptimization);
  addList('Industry-Specific Tips', analysis.industrySpecific);

  // Complete list per section (limit to 5 suggestions each)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  ensure(20);
  doc.text('Detailed Recommendations by Section', marginX, y);
  y += 16;
  Object.entries(analysis.sections).forEach(([name, data]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    ensure(16);
    doc.text(`${capitalize(name)} — ${data.score}/100`, marginX, y);
    y += 12;
    doc.setFont('helvetica', 'normal');
    (data.suggestions || []).slice(0, 5).forEach((it) => {
      const lines = doc.splitTextToSize(`• ${it}`, pageW - marginX * 2);
      ensure(12 + (lines.length - 1) * 12);
      doc.text(lines, marginX + 12, y);
      y += 12 + (lines.length - 1) * 12;
    });
    y += 8;
  });

  doc.save('varuna-resume-analysis.pdf');
}
