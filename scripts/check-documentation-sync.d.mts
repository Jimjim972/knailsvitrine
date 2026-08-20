export const DOCUMENTATION_SOURCES: readonly string[];
export function inspectDocumentationSync(workspace: string, candidateSha: string): {
  status: "passed";
  candidateSha: string;
  sources: number;
  requirements: number;
  tasks: number;
};
