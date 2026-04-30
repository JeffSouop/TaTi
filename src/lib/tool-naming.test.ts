import { describe, expect, it } from "vitest";
import { decodeToolName, encodeToolName, shortServerId } from "@/lib/tool-naming";

describe("tool-naming", () => {
  it("encode un nom outil avec prefix serveur deterministe", () => {
    const encoded = encodeToolName(
      "72fab08a-2e5f-4e80-0342-a34fdd526e6c",
      "github.create-repository",
    );
    expect(encoded).toBe("srv72fab08a__github_create_repository");
  });

  it("decode un nom encode valide", () => {
    const decoded = decodeToolName("srv72fab08a__list_repositories");
    expect(decoded).toEqual({ serverShortId: "72fab08a", toolName: "list_repositories" });
  });

  it("retourne null pour un format invalide", () => {
    expect(decodeToolName("not-a-valid-tool-name")).toBeNull();
  });

  it("shortServerId retire les tirets et tronque a 8 chars", () => {
    expect(shortServerId("72fab08a-2e5f-4e80-0342-a34fdd526e6c")).toBe("72fab08a");
  });
});
