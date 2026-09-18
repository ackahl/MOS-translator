import crosswalk from "../data/mos_crosswalk.json";
import { Translator } from "../components/Translator";
import type { Crosswalk } from "../lib/types";

export default function Page() {
  return <Translator data={crosswalk as Crosswalk} />;
}
