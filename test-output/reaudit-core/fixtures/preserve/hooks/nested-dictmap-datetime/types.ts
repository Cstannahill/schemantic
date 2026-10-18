export interface SubEntry {
  label?: string | undefined;
  data_points?: { timestamp: string; value: number; }[] | undefined;
}

export interface Entry {
  value?: number | undefined;
  tags?: string[] | undefined;
  subentries?: SubEntry[] | undefined;
}

export interface Report {
  id: string;
  created_at: string;
  metadata?: Record<string, string> | undefined;
  entries: Entry[];
}