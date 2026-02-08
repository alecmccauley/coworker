import { InsiderSignUpFlow } from "./insider-sign-up-flow";

type ReleaseManifest = {
  latest: string;
  releases: Array<{
    version: string;
    date: string;
    files: {
      mac?: {
        url: string;
      };
    };
  }>;
};

type DownloadUrls = {
  mac?: string;
};

const getLatestDownloadUrls = async (): Promise<DownloadUrls> => {
  const manifestUrl = process.env.DOWNLOAD_MANIFEST_URL;
  if (!manifestUrl) return {};

  try {
    const response = await fetch(manifestUrl, { cache: "no-store" });
    if (!response.ok) return {};

    const manifest = (await response.json()) as ReleaseManifest;
    if (!manifest.latest || !Array.isArray(manifest.releases)) return {};

    const latest = manifest.releases.find(
      (entry) => entry.version === manifest.latest
    );
    if (!latest?.files) return {};

    return {
      mac: latest.files.mac?.url,
    };
  } catch {
    return {};
  }
};

export default async function InsiderSignUpPage() {
  const { mac } = await getLatestDownloadUrls();

  return <InsiderSignUpFlow downloadUrlMac={mac} />;
}
