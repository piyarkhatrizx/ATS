import { describe, expect, it } from "vitest";
import { PAGE_SIZE, parseListParams, withParam } from "@/lib/list-params";

describe("list searchParams contract", () => {
  it("rejects an unknown sort key instead of passing it to Prisma", () => {
    const parsed = parseListParams("applications", { sort: "candidate.ssn" });

    expect(parsed.sort).toBe("appliedAt");
    expect(parsed.rejected).toContain("sort");
    expect(JSON.stringify(parsed.orderBy)).not.toContain("ssn");
  });

  it("rejects a sort key that is valid on another view", () => {
    // `email` sorts candidates, not applications. Views must not borrow keys.
    const parsed = parseListParams("applications", { sort: "email" });
    expect(parsed.sort).toBe("appliedAt");
    expect(parsed.rejected).toContain("sort");
  });

  it("accepts an allowlisted sort key and honours dir", () => {
    const parsed = parseListParams("applications", { sort: "status", dir: "desc" });
    expect(parsed.sort).toBe("status");
    expect(parsed.orderBy).toEqual({ status: "desc" });
    expect(parsed.rejected).toEqual([]);
  });

  it("drops unknown source and status values", () => {
    const parsed = parseListParams("applications", { source: "CARRIER_PIGEON", status: "PROMOTED" });
    expect(parsed.source).toBeNull();
    expect(parsed.status).toBeNull();
    expect(parsed.rejected).toEqual(expect.arrayContaining(["source", "status"]));
  });

  it("keeps valid filters", () => {
    const parsed = parseListParams("applications", { source: "APPLY_FORM", status: "PHONE_SCREEN" });
    expect(parsed.source).toBe("APPLY_FORM");
    expect(parsed.status).toBe("PHONE_SCREEN");
    expect(parsed.rejected).toEqual([]);
  });

  it("clamps junk and out-of-range pages to the first page", () => {
    for (const page of ["0", "-3", "abc", "1.5"]) {
      expect(parseListParams("candidates", { page }).page).toBe(1);
    }
    const third = parseListParams("candidates", { page: "3" });
    expect(third.page).toBe(3);
    expect(third.skip).toBe(2 * PAGE_SIZE);
    expect(third.take).toBe(PAGE_SIZE);
  });

  it("takes the first value when a param is repeated", () => {
    const parsed = parseListParams("applications", { source: ["EMAIL", "APPLY_FORM"] });
    expect(parsed.source).toBe("EMAIL");
  });

  it("preserves other params when one changes, and resets page", () => {
    const query = { source: "EMAIL", sort: "status", page: "4" };
    expect(withParam(query, "source", "APPLY_FORM")).toBe("?sort=status&source=APPLY_FORM");
    expect(withParam(query, "source", null)).toBe("?sort=status");
    // Paging keeps the filters it was paging through.
    expect(withParam(query, "page", "5")).toBe("?source=EMAIL&sort=status&page=5");
  });
});
