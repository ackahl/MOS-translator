export type SocMatch = { code: string; title: string };

export type MilitaryOccupation = {
  /** Service branch the code belongs to, derived from the crosswalk's SVC field. */
  branch: string;
  /** What kind of code this is, e.g. "Military Occupational Specialty (MOS)". */
  codeType: string;
  /** Military Personnel Category: Enlisted, Commissioned Officer, Warrant Officer, Civilian. */
  category: string;
  code: string;
  title: string;
  matches: SocMatch[];
};

export type CrosswalkMeta = {
  source: string;
  origin: string;
  generated: string;
  counts: {
    occupations: number;
    matches: number;
    skippedObsolete: number;
    skippedNoMatch: number;
    skippedUnknownSvc: number;
  };
  branches: string[];
};

export type Crosswalk = CrosswalkMeta & { occupations: MilitaryOccupation[] };

export type SearchResponse = {
  total: number;
  results: MilitaryOccupation[];
};
