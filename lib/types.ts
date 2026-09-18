export type SocMatch = { code: string; title: string };

export type MilitaryOccupation = {
  branch: string;
  code: string;
  title: string;
  matches: SocMatch[];
};

export type Crosswalk = {
  source: string;
  generated: string;
  occupations: MilitaryOccupation[];
};
