import { NextResponse } from "next/server";
import { listMegaFiles, findDuplicateNames } from "@/lib/mega-service";
import { getGitHubMediaFileNames } from "@/lib/github-service";

export async function GET() {
  try {
    const { files, error } = await listMegaFiles();

    if (error) {
      return NextResponse.json({ files: [], error, totalSizeBytes: 0 }, { status: 200 });
    }

    const githubFileNames = await getGitHubMediaFileNames();
    const duplicateNames = findDuplicateNames(files, githubFileNames);

    // Only return files NOT already in GitHub
    const newFiles = files
      .filter((f) => !duplicateNames.has(f.name))
      .map((f) => ({
        ...f,
        alreadyInGitHub: false,
      }));

    const totalSize = newFiles.reduce((sum, f) => sum + f.size, 0);

    return NextResponse.json({
      files: newFiles,
      totalInMega: files.length,
      totalSizeBytes: totalSize,
      alreadyTransferred: files.length - newFiles.length,
    });
  } catch (error) {
    console.error("GET /api/mega/list error:", error);
    return NextResponse.json(
      { files: [], error: "Failed to list Mega files.", totalSizeBytes: 0 },
      { status: 500 }
    );
  }
}
