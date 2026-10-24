import { describe, expect, it } from "vitest";
import { accusative, dative, genitive } from "../src/game/grammar";

describe("Türkçe ad ekleri", () => {
  it("ünlüyle biten adlarda kaynaştırma harfi kullanır", () => {
    expect(accusative("Bilge Elçi")).toBe("Bilge Elçi'yi");
    expect(dative("Bilge Elçi")).toBe("Bilge Elçi'ye");
    expect(genitive("Bilge Elçi")).toBe("Bilge Elçi'nin");
    expect(accusative("Poyraz Nişancı")).toBe("Poyraz Nişancı'yı");
    expect(dative("Poyraz Nişancı")).toBe("Poyraz Nişancı'ya");
    expect(genitive("Poyraz Nişancı")).toBe("Poyraz Nişancı'nın");
  });

  it("ünsüzle biten adlarda ünlü uyumunu uygular", () => {
    expect(accusative("Demir Muhafız")).toBe("Demir Muhafız'ı");
    expect(dative("Demir Muhafız")).toBe("Demir Muhafız'a");
    expect(genitive("Demir Muhafız")).toBe("Demir Muhafız'ın");
    expect(accusative("Mehmet")).toBe("Mehmet'i");
    expect(dative("Mehmet")).toBe("Mehmet'e");
    expect(genitive("Mehmet")).toBe("Mehmet'in");
  });
});
