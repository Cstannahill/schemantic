export interface SubEntry {
  label?: string | undefined;
  dataPoints?: { timestamp: string; value: number; }[] | undefined;
}

export interface Entry {
  value?: number | undefined;
  tags?: string[] | undefined;
  subentries?: SubEntry[] | undefined;
}

export interface Report {
  id: string;
  createdAt: string;
  metadata?: Record<string, string> | undefined;
  entries: Entry[];
}