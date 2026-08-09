import { NextResponse } from "next/server";
import { listMegaFiles, findDuplicateNames } from "@/lib/mega-service";
import { getGitHubMediaFileNames } from "@/lib/github-service";

export async function GET() {
  try {
    // Single Mega connection — fetch files once
    const { files, error } = await listMegaFiles();

    if (error) {
      return NextResponse.json({ files: [], error }, { status: 200 });
    }

    // Get GitHub file names for duplicate checking (no second Mega call)
    const githubFileNames = await getGitHubMediaFileNames();
    const duplicateNames = findDuplicateNames(files, githubFileNames);

    const filesWithStatus = files.map((f) => ({
      ...f,
      alreadyInGitHub: duplicateNames.has(f.name),
    }));

    return NextResponse.json({ files: filesWithStatus });
  } catch (error) {
    console.error("GET /api/mega/list error:", error);
    return NextResponse.json(
      { files: [], error: "Failed to list Mega files." },
      { status: 500 }
    );
  }
}
