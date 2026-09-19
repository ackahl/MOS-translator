import { ALL } from "../lib/branches";
import { BranchShell } from "../components/BranchShell";

export default function Page() {
  return <BranchShell branch={ALL} slug="all" />;
}
