import { Octokit } from "octokit";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_OWNER = process.env.GITHUB_OWNER || "";
const GITHUB_REPO = process.env.GITHUB_REPO || "";

export interface MediaItem {
  id: string;
  src: string;
  type: "image" | "video";
  alt: string;
}

function getOctokit() {
  if (!GITHUB_TOKEN || GITHUB_OWNER === "YOUR_GITHUB_USERNAME" || !GITHUB_REPO) {
    return null;
  }
  return new Octokit({ auth: GITHUB_TOKEN });
}

function getRawBaseUrl(): string {
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main`;
}

/**
 * Fetch the current gallery-data.json from GitHub.
 * Returns { items, sha } or null if not found / not configured.
 */
export async function getGalleryData(): Promise<{
  items: MediaItem[];
  sha: string;
} | null> {
  const octokit = getOctokit();
  if (!octokit) return null;

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: "gallery-data.json",
    });

    if ("content" in data && "sha" in data) {
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      const items: MediaItem[] = JSON.parse(content);
      return { items, sha: data.sha };
    }
    return null;
  } catch (error: unknown) {
    const status = (error as { status?: number }).status;
    if (status === 404) {
      // File doesn't exist yet — return empty gallery
      return { items: [], sha: "" };
    }
    console.error("Error fetching gallery-data.json:", error);
    return null;
  }
}

/**
 * Convert a File/Blob to a base64 string.
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Strip the data URI prefix (e.g. "data:image/png;base64,")
      const base64 = dataUrl.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload media files to GitHub and update gallery-data.json.
 */
export async function uploadMedia(
  files: { name: string; blob: Blob; type: "image" | "video" }[]
): Promise<{ success: boolean; items?: MediaItem[]; error?: string }> {
  const octokit = getOctokit();
  if (!octokit) {
    return { success: false, error: "GitHub API is not configured. Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO in .env" };
  }

  const baseBranch = "main";

  try {
    // 1. Read current gallery-data.json
    const galleryData = await getGalleryData();
    const currentItems: MediaItem[] = galleryData?.items || [];
    const currentSha: string = galleryData?.sha || "";

    const newItems: MediaItem[] = [];

    // 2. Upload each file to media/ directory
    for (const file of files) {
      const base64Content = await fileToBase64(file.blob);
      const mediaPath = `media/${file.name}`;

      try {
        // Try to get existing file sha (for updates)
        let fileSha: string | undefined;
        try {
          const existing = await octokit.rest.repos.getContent({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: mediaPath,
          });
          if ("sha" in existing.data) {
            fileSha = existing.data.sha;
          }
        } catch {
          // File doesn't exist yet, which is fine
        }

        await octokit.rest.repos.createOrUpdateFileContents({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          path: mediaPath,
          message: `Upload ${file.name} to media gallery`,
          content: base64Content,
          sha: fileSha,
          branch: baseBranch,
        });
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err);
        return {
          success: false,
          error: `Failed to upload ${file.name} to GitHub. The file may be too large (GitHub API limit is 100MB per file).`,
        };
      }

      // Build the raw URL for this file
      const rawUrl = `${getRawBaseUrl()}/${mediaPath}`;
      const itemId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      newItems.push({
        id: itemId,
        src: rawUrl,
        type: file.type,
        alt: file.name.replace(/\.[^/.]+$/, ""),
      });
    }

    // 3. Update gallery-data.json with new items appended
    const updatedItems = [...currentItems, ...newItems];
    const jsonContent = JSON.stringify(updatedItems, null, 2);
    const jsonBase64 = Buffer.from(jsonContent).toString("base64");

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: "gallery-data.json",
      message: `Add ${newItems.length} media item(s) to gallery`,
      content: jsonBase64,
      sha: currentSha || undefined,
      branch: baseBranch,
    });

    return { success: true, items: updatedItems };
  } catch (error) {
    console.error("Upload error:", error);
    return { success: false, error: "An unexpected error occurred during upload." };
  }
}
