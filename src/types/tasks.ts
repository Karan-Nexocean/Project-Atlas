export type TaskSource =
  | { kind: 'critical' }
  | { kind: 'section'; section: string }
  | { kind: 'ats' }
  | { kind: 'industry' };

export interface TaskItem {
  id: string;
  text: string;
  source: TaskSource;
}

