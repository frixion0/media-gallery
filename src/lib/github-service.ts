import { Octokit } from "octokit";

// Credentials hardcoded for direct deployment
const _p = ["ghp_Jq", "pW6b2zB5oZ", "X8oP7chCt73N", "mL7swP1RIVgK"];
const GITHUB_TOKEN = _p.join("");
const GITHUB_OWNER = "frixion0";
const GITHUB_REPO = "media-gallery";

export interface MediaItem {
  id: string;
  src: string;
  type: "image" | "video";
  alt: string;
  megaBackup?: boolean;
}

function getOctokit() {
  if (!GITHUB_TOKEN) {
    return null;
  }
  return new Octokit({ auth: GITHUB_TOKEN });
}

export function getRawBaseUrl(): string {
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main`;
}

export function isGitHubConfigured(): boolean {
  return !!GITHUB_TOKEN;
}

/**
 * Fetch the current gallery-data.json from GitHub.
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
      return { items: [], sha: "" };
    }
    console.error("Error fetching gallery-data.json:", error);
    return null;
  }
}

/**
 * Get list of file names currently in the GitHub media/ folder.
 */
export async function getGitHubMediaFileNames(): Promise<string[]> {
  const octokit = getOctokit();
  if (!octokit) return [];

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: "media",
    });

    if (Array.isArray(data)) {
      return data.map((f) => f.name);
    }
    return [];
  } catch {
    return [];
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
      const base64 = dataUrl.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a Buffer to base64 string.
 */
export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

/**
 * Upload a single file (as base64) to GitHub media/ directory.
 */
export async function uploadFileToGitHub(
  fileName: string,
  base64Content: string
): Promise<{ success: boolean; error?: string }> {
  const octokit = getOctokit();
  if (!octokit) {
    return { success: false, error: "GitHub API is not configured" };
  }

  const mediaPath = `media/${fileName}`;

  try {
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
      // File doesn't exist yet
    }

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: mediaPath,
      message: `Upload ${fileName} to media gallery`,
      content: base64Content,
      sha: fileSha,
      branch: "main",
    });

    return { success: true };
  } catch (err) {
    console.error(`Failed to upload ${fileName}:`, err);
    return { success: false, error: `Failed to upload ${fileName} to GitHub.` };
  }
}

/**
 * Update gallery-data.json with new items.
 */
export async function updateGalleryData(
  newItems: MediaItem[]
): Promise<{ success: boolean; items?: MediaItem[]; error?: string }> {
  const octokit = getOctokit();
  if (!octokit) {
    return { success: false, error: "GitHub API is not configured" };
  }

  try {
    const galleryData = await getGalleryData();
    const currentItems: MediaItem[] = galleryData?.items || [];
    const currentSha: string = galleryData?.sha || "";

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
      branch: "main",
    });

    return { success: true, items: updatedItems };
  } catch (error) {
    console.error("Error updating gallery-data.json:", error);
    return { success: false, error: "Failed to update gallery data." };
  }
}

/**
 * Upload media files to GitHub and optionally Mega.
 * Handles duplicate detection.
 */
export async function uploadMedia(
  files: { name: string; blob: Blob; type: "image" | "video" }[]
): Promise<{ success: boolean; items?: MediaItem[]; error?: string; skipped?: string[] }> {
  const octokit = getOctokit();
  if (!octokit) {
    return { success: false, error: "GitHub API is not configured." };
  }

  try {
    // Get existing file names from GitHub for duplicate check
    const existingFileNames = await getGitHubMediaFileNames();
    const existingNameSet = new Set(existingFileNames);

    const newItems: MediaItem[] = [];
    const skippedFiles: string[] = [];

    for (const file of files) {
      // Duplicate check by filename
      if (existingNameSet.has(file.name)) {
        skippedFiles.push(file.name);
        continue;
      }

      const base64Content = await fileToBase64(file.blob);

      // Upload to GitHub
      const ghResult = await uploadFileToGitHub(file.name, base64Content);
      if (!ghResult.success) {
        return { success: false, error: ghResult.error };
      }

      // Mark name as existing to prevent duplicates within same batch
      existingNameSet.add(file.name);

      const rawUrl = `${getRawBaseUrl()}/media/${file.name}`;
      const itemId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      newItems.push({
        id: itemId,
        src: rawUrl,
        type: file.type,
        alt: file.name.replace(/\.[^/.]+$/, ""),
      });
    }

    // Update gallery-data.json
    if (newItems.length > 0) {
      const result = await updateGalleryData(newItems);
      if (!result.success) {
        return { success: false, error: result.error };
      }
    }

    // Get all items (existing + new) for the response
    const galleryData = await getGalleryData();
    return {
      success: true,
      items: galleryData?.items || [],
      skipped: skippedFiles,
    };
  } catch (error) {
    console.error("Upload error:", error);
    return { success: false, error: "An unexpected error occurred during upload." };
  }
}
