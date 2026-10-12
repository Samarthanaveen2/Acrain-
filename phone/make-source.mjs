// Builds the SideStore/AltStore source (apps.json) from the repo's GitHub releases,
// so SideStore can install, update and roll back to any published version.
// Usage: node phone/make-source.mjs releases.json <owner/repo> > apps.json
import fs from "node:fs";

const [file, repo] = process.argv.slice(2);
const releases = JSON.parse(fs.readFileSync(file, "utf8"));
const raw = `https://raw.githubusercontent.com/${repo}/sidestore`;

const versions = releases
  .filter((r) => /^app-\d+$/.test(r.tag_name) && !r.draft)
  .map((r) => {
    const ipa = r.assets.find((a) => a.name === "Acrain.ipa");
    const build = r.tag_name.slice(4);
    return ipa && {
      version: `1.0.${build}`,
      buildVersion: build,
      date: r.published_at,
      localizedDescription: `Acrain 1.0.${build}`,
      downloadURL: ipa.browser_download_url,
      size: ipa.size,
      minOSVersion: "15.0",
    };
  })
  .filter(Boolean)
  .sort((a, b) => Number(b.buildVersion) - Number(a.buildVersion));

const source = {
  name: "Acrain",
  identifier: "com.samartha.acrain.source",
  subtitle: "My thinking about the world, linked.",
  iconURL: `${raw}/icon.png`,
  website: `https://github.com/${repo}`,
  tintColor: "#2a623d",
  apps: [
    {
      name: "Acrain",
      bundleIdentifier: "com.samartha.acrain",
      developerName: "Samartha",
      subtitle: "Notes on ideas, and the connections between them.",
      localizedDescription:
        "Write notes about the world in ai-2027's style, link ideas together, and see them on a map and a timeline. Notes are saved on your phone.",
      iconURL: `${raw}/icon.png`,
      tintColor: "#2a623d",
      category: "productivity",
      screenshots: [],
      versions,
      appPermissions: { entitlements: [], privacy: {} },
    },
  ],
  news: [],
};

process.stdout.write(JSON.stringify(source, null, 2) + "\n");
