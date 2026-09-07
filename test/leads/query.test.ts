import { describe, expect, it } from "vitest";
import { buildLeadWhere, sinceLabel } from "@/lib/leads/query";
import { parseListParams } from "@/lib/list-params";

describe("lead inbox filters", () => {
  it("derives uncalled from the activity log, never from a column", () => {
    const where = buildLeadWhere({ source: null, status: null, job: null, uncalled: true });
    // A denormalised firstCalledAt would drift; the events are the truth.
    expect(where.activities).toEqual({ none: { type: "CALL_LOGGED" } });
    expect(where).not.toHaveProperty("firstCalledAt");
  });

  it("omits every filter that is not set", () => {
    const where = buildLeadWhere({ source: null, status: null, job: null, uncalled: false });
    expect(where).toEqual({});
  });

  it("scopes to a requisition, which is what carries /jobs/[id] bookmarks over", () => {
    const where = buildLeadWhere({ source: null, status: null, job: "job_1", uncalled: false });
    expect(where.jobId).toBe("job_1");
  });

  it("filters status through the relation, since statuses are rows", () => {
    const where = buildLeadWhere({ source: null, status: "SCREENING", job: null, uncalled: false });
    expect(where.statusRef).toEqual({ key: "SCREENING" });
  });

  it("combines filters rather than letting one replace another", () => {
    const where = buildLeadWhere({
      source: "APPLY_FORM",
      status: "NEW",
      job: "job_2",
      uncalled: true,
    });
    expect(where).toMatchObject({
      source: "APPLY_FORM",
      jobId: "job_2",
      statusRef: { key: "NEW" },
      activities: { none: { type: "CALL_LOGGED" } },
    });
  });
});

describe("lead searchParams", () => {
  it("defaults to newest first", () => {
    const parsed = parseListParams("leads", {});
    expect(parsed.sort).toBe("appliedAt");
    expect(parsed.orderBy).toEqual({ appliedAt: "desc" });
    expect(parsed.uncalled).toBe(false);
    expect(parsed.job).toBeNull();
  });

  it("reads uncalled only from an explicit 1", () => {
    expect(parseListParams("leads", { uncalled: "1" }).uncalled).toBe(true);
    for (const value of ["0", "true", "yes", ""]) {
      expect(parseListParams("leads", { uncalled: value }).uncalled).toBe(false);
    }
  });

  it("rejects a job id that is not id-shaped", () => {
    for (const bad of ["../etc", "a b", "x".repeat(41)]) {
      const parsed = parseListParams("leads", { job: bad });
      expect(parsed.job, bad).toBeNull();
      expect(parsed.rejected, bad).toContain("job");
    }
    expect(parseListParams("leads", { job: "cmtqa4gxb0000dloagqj8qkr3" }).job).toBe(
      "cmtqa4gxb0000dloagqj8qkr3",
    );
  });

  it("rejects a sort key borrowed from another view", () => {
    // `email` sorts candidates, not leads.
    const parsed = parseListParams("leads", { sort: "email" });
    expect(parsed.sort).toBe("appliedAt");
    expect(parsed.rejected).toContain("sort");
  });
});

describe("time since applied", () => {
  const now = new Date("2026-09-07T12:00:00Z").getTime();
  const ago = (ms: number) => new Date(now - ms);

  it("reads compactly at every scale", () => {
    expect(sinceLabel(ago(30_000), now)).toBe("now");
    expect(sinceLabel(ago(5 * 60_000), now)).toBe("5m");
    expect(sinceLabel(ago(3 * 3_600_000), now)).toBe("3h");
    expect(sinceLabel(ago(2 * 86_400_000), now)).toBe("2d");
    expect(sinceLabel(ago(90 * 86_400_000), now)).toBe("3mo");
  });

  it("never renders a negative age from clock skew", () => {
    expect(sinceLabel(new Date(now + 60_000), now)).toBe("now");
  });
});
