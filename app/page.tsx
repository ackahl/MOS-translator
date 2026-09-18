import crosswalk from "../data/mos_crosswalk.json";
import { Translator } from "../components/Translator";
import type { Crosswalk, CrosswalkMeta } from "../lib/types";

export default function Page() {
  const { occupations, ...meta } = crosswalk as Crosswalk;
  return <Translator meta={meta as CrosswalkMeta} />;
}
