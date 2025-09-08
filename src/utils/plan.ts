import type { TaskItem } from '../components/TaskPanel';

export interface SimplePlan {
  minMinutes: number;
  maxMinutes: number;
}

function isQuickFix(text: string, section?: string): boolean {
  const t = text.toLowerCase();
  if (section && (section === 'contact' || section === 'formatting')) return true;
  return [
    'linkedin', 'link', 'url', 'hyperlink',
    'format', 'spacing', 'line breaks', 'bullet', 'punctuation', 'typo', 'spelling',
    'font', 'layout', 'single-column', 'single column', 'header', 'footer',
    'date format', 'phone', 'email'
  ].some((k) => t.includes(k));
}

export function estimatePlanFromTasks(tasks: TaskItem[]): SimplePlan {
  let min = 0;
  let max = 0;
  for (const t of tasks) {
    const s = t.source;
    const text = t.text || '';
    if (s.kind === 'industry') {
      min += 5; max += 7; // domain-specific tailoring
      continue;
    }
    if (s.kind === 'ats') {
      min += 3; max += 5; // keyword/ATS changes
      continue;
    }
    if (s.kind === 'section') {
      const sec = s.section;
      if (isQuickFix(text, sec)) { min += 2; max += 3; continue; }
      if (sec === 'experience') { min += 5; max += 7; continue; }
      if (sec === 'summary') { min += 4; max += 6; continue; }
      if (sec === 'skills' || sec === 'education') { min += 4; max += 6; continue; }
    }
    if (s.kind === 'critical') { min += 6; max += 10; continue; }
    // default
    min += 4; max += 6;
  }
  return { minMinutes: min, maxMinutes: max };
}

