import { NextResponse } from "next/server";
import { listMegaFiles, checkDuplicates } from "@/lib/mega-service";
import { getGitHubMediaFileNames } from "@/lib/github-service";

export async function GET() {
  try {
    const { files, error } = await listMegaFiles();

    if (error) {
      return NextResponse.json({ files: [], error }, { status: 200 });
    }

    // Get GitHub file names for duplicate checking
    const githubFileNames = await getGitHubMediaFileNames();
    const { duplicateNames } = await checkDuplicates(githubFileNames);

    // Mark files that are already in GitHub
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
