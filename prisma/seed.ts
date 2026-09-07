/**
 * Realistic data for design verification. Run: npm run seed
 *
 * Idempotent by construction: every row carries an explicit `seed-*` id, so a
 * rerun upserts in place rather than duplicating. Deleting a seed row by hand
 * and rerunning recreates exactly that row.
 *
 * The data is shaped to stress layout, not to look tidy — extreme name lengths,
 * every status and source represented, missing phone numbers, dates spread over
 * weeks. Activity rows are written as plain literals matching the three
 * existing call sites (lib/intake.ts, lib/parser.ts, app/actions/application.ts)
 * because lib/activity/ does not exist yet.
 */
import { Prisma, type ApplicationSource, type ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const CAREGIVER_ALIAS = process.env.CAREGIVER_JOB_ALIAS ?? "caregiver";
const SECOND_ALIAS = "overnight";

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);

/**
 * Matches what caregiverApplicationSchema produces, which is what lib/intake.ts
 * writes into Application.screening. Only APPLY_FORM applications get one:
 * the email path never asks these questions, and seeing null render alongside
 * real answers is the point.
 */
type Screening = {
  isAtLeast18: boolean;
  isCpaCertified: boolean | null;
  patientUsesMedicare: boolean;
  caregivingInterest: "GENERAL_CAREGIVER" | "CURRENTLY_CARING_FOR_PATIENT";
};

type SeedCandidate = {
  key: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  currentTitle: string | null;
  currentEmployer: string | null;
  status: ApplicationStatus;
  source: ApplicationSource;
  daysAgo: number;
  screening?: Screening;
  /** Also applies to the second requisition, to exercise cross-application UI. */
  alsoOvernight?: { status: ApplicationStatus; source: ApplicationSource; daysAgo: number; screening?: Screening };
  /** How many extra STATUS_CHANGED rows to write. 0 leaves an empty timeline. */
  history?: ApplicationStatus[];
};

// Names run from two letters to forty-plus, with hyphens, accents and a
// suffix, so column widths and truncation have something to fail against.
const CANDIDATES: SeedCandidate[] = [
  {
    key: "01", firstName: "Bo", lastName: "Ng",
    email: "bo.ng@example.com", phone: "(216) 555-0142",
    location: "Cleveland, OH", currentTitle: "CNA", currentEmployer: "Riverside Senior Living",
    status: "NEW", source: "APPLY_FORM", daysAgo: 1,
    screening: { isAtLeast18: true, isCpaCertified: null, patientUsesMedicare: false, caregivingInterest: "GENERAL_CAREGIVER" },
  },
  {
    key: "02", firstName: "María José", lastName: "Fernández-Villalobos",
    email: "mariajose.fernandez.villalobos@example.com", phone: "(216) 555-0198",
    location: "Lakewood, OH", currentTitle: "Home Health Aide", currentEmployer: "Bright Path Home Care",
    status: "SCREENING", source: "EMAIL", daysAgo: 3,
    history: ["NEW", "SCREENING"],
  },
  {
    key: "03", firstName: "Christopher Alexander", lastName: "Wetherington-Smythe III",
    email: "christopher.a.wetherington.smythe@example.com", phone: "(440) 555-0177",
    location: "Shaker Heights, OH",
    currentTitle: "Certified Nursing Assistant and Overnight Care Coordinator",
    currentEmployer: "Evergreen Extended Care Partners of Northeast Ohio",
    status: "PHONE_SCREEN", source: "REFERRAL", daysAgo: 6,
    history: ["NEW", "SCREENING", "PHONE_SCREEN"],
    alsoOvernight: { status: "SCREENING", source: "REFERRAL", daysAgo: 4 },
  },
  {
    key: "04", firstName: "Aisha", lastName: "Okonkwo",
    email: "aisha.okonkwo@example.com", phone: "(216) 555-0113",
    location: "Euclid, OH", currentTitle: "Caregiver", currentEmployer: "Harbor Light Homes",
    status: "INTERVIEW", source: "APPLY_FORM", daysAgo: 9,
    screening: { isAtLeast18: true, isCpaCertified: true, patientUsesMedicare: true, caregivingInterest: "CURRENTLY_CARING_FOR_PATIENT" },
    history: ["NEW", "SCREENING", "PHONE_SCREEN", "INTERVIEW"],
    alsoOvernight: { status: "NEW", source: "APPLY_FORM", daysAgo: 2, screening: { isAtLeast18: true, isCpaCertified: false, patientUsesMedicare: true, caregivingInterest: "CURRENTLY_CARING_FOR_PATIENT" } },
  },
  {
    key: "05", firstName: "Dmitri", lastName: "Volkov",
    email: "d.volkov@example.com", phone: "(330) 555-0164",
    location: "Akron, OH", currentTitle: "Personal Care Aide", currentEmployer: "Summit Care Group",
    status: "OFFER", source: "REFERRAL", daysAgo: 14,
    history: ["NEW", "PHONE_SCREEN", "INTERVIEW", "OFFER"],
  },
  {
    key: "06", firstName: "Grace", lastName: "Abara",
    email: "grace.abara@example.com", phone: "(216) 555-0155",
    location: "Cleveland Heights, OH", currentTitle: "Senior Caregiver", currentEmployer: "Willow Creek Residences",
    status: "HIRED", source: "EMAIL", daysAgo: 21,
    history: ["NEW", "SCREENING", "PHONE_SCREEN", "INTERVIEW", "OFFER", "HIRED"],
  },
  {
    key: "07", firstName: "Tom", lastName: "Ek",
    email: "tom.ek@example.com", phone: "(440) 555-0129",
    location: "Parma, OH", currentTitle: null, currentEmployer: null,
    status: "REJECTED", source: "MANUAL", daysAgo: 17,
    history: ["NEW", "SCREENING", "REJECTED"],
  },
  {
    key: "08", firstName: "Priyanka", lastName: "Raghunathan",
    email: "priyanka.raghunathan@example.com", phone: "(216) 555-0186",
    location: "Westlake, OH", currentTitle: "Hospice Aide", currentEmployer: "Compassus",
    status: "WITHDRAWN", source: "APPLY_FORM", daysAgo: 25,
    screening: { isAtLeast18: true, isCpaCertified: true, patientUsesMedicare: false, caregivingInterest: "GENERAL_CAREGIVER" },
    history: ["NEW", "SCREENING", "WITHDRAWN"],
  },
  // No phone on file — the Call button's disabled state is otherwise unreachable.
  {
    key: "09", firstName: "Yusuf", lastName: "Demirci",
    email: "yusuf.demirci@example.com", phone: null,
    location: "Strongsville, OH", currentTitle: "Caregiver", currentEmployer: "Anchor Home Services",
    status: "NEW", source: "EMAIL", daysAgo: 2,
  },
  {
    key: "10", firstName: "Wilhelmina", lastName: "Vandersteen-Rutherford",
    email: "wilhelmina.vandersteen.rutherford@example.com", phone: null,
    location: "Rocky River, OH", currentTitle: "Live-In Caregiver", currentEmployer: "Northcoast Private Duty",
    status: "SCREENING", source: "MANUAL", daysAgo: 11,
    history: ["NEW", "SCREENING"],
  },
  {
    key: "11", firstName: "Li", lastName: "Wu",
    email: "li.wu@example.com", phone: "(216) 555-0102",
    location: "Cleveland, OH", currentTitle: "Home Care Aide", currentEmployer: "Golden Years LLC",
    status: "PHONE_SCREEN", source: "MANUAL", daysAgo: 8,
    history: ["NEW", "PHONE_SCREEN"],
  },
  {
    key: "12", firstName: "Jean-Baptiste", lastName: "Ngoma-Kabila",
    email: "jeanbaptiste.ngoma.kabila@example.com", phone: "(216) 555-0171",
    location: "Garfield Heights, OH", currentTitle: "Direct Support Professional", currentEmployer: "Koinonia",
    status: "INTERVIEW", source: "REFERRAL", daysAgo: 13,
    history: ["NEW", "SCREENING", "INTERVIEW"],
    alsoOvernight: { status: "PHONE_SCREEN", source: "EMAIL", daysAgo: 7 },
  },
  {
    key: "13", firstName: "Sarah", lastName: "O'Brien",
    email: "sarah.obrien@example.com", phone: "(440) 555-0138",
    location: "North Olmsted, OH", currentTitle: "STNA", currentEmployer: "Legacy Health Services",
    // Disqualifying on age: the columns should show a real No, not all Yes.
    status: "NEW", source: "APPLY_FORM", daysAgo: 4,
    screening: { isAtLeast18: false, isCpaCertified: null, patientUsesMedicare: false, caregivingInterest: "GENERAL_CAREGIVER" },
  },
  {
    key: "14", firstName: "Ana", lastName: "Cruz",
    // Parsed-from-resume record with almost nothing on it: the sparse row case.
    email: "ana.cruz@example.com", phone: "(216) 555-0190",
    location: null, currentTitle: null, currentEmployer: null,
    status: "NEW", source: "EMAIL", daysAgo: 30,
  },
];

/**
 * Apply-form volume, so /applications has enough rows to judge density against
 * rather than six. Deterministic by index — no randomness anywhere, so reruns
 * produce byte-identical data and the upserts stay no-ops.
 */
const BULK_NAMES: Array<[string, string]> = [
  ["Ana", "Ko"],
  ["Devontae", "Washington-Pierre"],
  ["Mei", "Lin"],
  ["Konstantinos", "Papadopoulos-Andreadis"],
  ["Fatima", "Al-Rashid"],
  ["Jo", "Ba"],
  ["Reginald", "Thornbury"],
  ["Nguyet", "Tran-Nguyen"],
  ["Oluwaseun", "Adebayo-Ogundimu"],
  ["Sam", "Roy"],
  ["Ekaterina", "Vasilievna-Morozova"],
  ["Tariq", "Hassan"],
  ["Bernadette", "Lecompte-Rousseau"],
  ["Kai", "Ng"],
  ["Anastasia", "Christodoulopoulou"],
  ["Marcus", "Webb"],
  ["Yolanda", "Estefania-Marquez"],
  ["Ib", "Oz"],
  ["Sylvester", "Kirkpatrick-Boyle"],
  ["Nadia", "Petrov"],
  ["Chukwuemeka", "Nwachukwu-Obi"],
  ["Ruth", "Mbeki"],
  ["Alessandro", "Giovanni-Bellucci"],
  ["Hye-Jin", "Park"],
  ["Bartholomew", "Fitzgerald-Hughes"],
  ["Zara", "Okafor"],
];

const BULK_STATUSES: ApplicationStatus[] = [
  "NEW", "NEW", "SCREENING", "PHONE_SCREEN", "INTERVIEW", "SCREENING",
  "REJECTED", "NEW", "OFFER", "SCREENING", "PHONE_SCREEN", "WITHDRAWN",
  "NEW", "INTERVIEW", "SCREENING", "HIRED", "NEW", "PHONE_SCREEN",
  "REJECTED", "SCREENING", "NEW", "INTERVIEW", "NEW", "SCREENING",
  "PHONE_SCREEN", "NEW",
];

const BULK: SeedCandidate[] = BULK_NAMES.map(([firstName, lastName], index) => {
  const key = String(15 + index).padStart(2, "0");
  const slug = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]/g, "");
  // Every 7th applicant is under 18 and every 5th skips the optional CPA
  // question, so the columns carry a real spread instead of a wall of Yes.
  const disqualified = index % 7 === 3;
  const skippedOptional = index % 5 === 2;
  return {
    key,
    firstName,
    lastName,
    email: `${slug}@example.com`,
    // Every 9th has no phone, extending the disabled-Call-button case.
    phone: index % 9 === 4 ? null : `(216) 555-${String(1000 + index * 7).slice(-4)}`,
    location: index % 3 === 0 ? "Cleveland, OH" : index % 3 === 1 ? "Lakewood, OH" : null,
    currentTitle: index % 4 === 0 ? "Home Health Aide" : index % 4 === 2 ? "CNA" : null,
    currentEmployer: index % 4 === 0 ? "Bright Path Home Care" : null,
    status: BULK_STATUSES[index],
    source: "APPLY_FORM",
    daysAgo: 1 + ((index * 3) % 34),
    screening: {
      isAtLeast18: !disqualified,
      isCpaCertified: skippedOptional ? null : index % 3 === 0,
      patientUsesMedicare: index % 2 === 0,
      caregivingInterest:
        index % 3 === 1 ? "CURRENTLY_CARING_FOR_PATIENT" : "GENERAL_CAREGIVER",
    },
    history: index % 4 === 1 ? ["NEW", BULK_STATUSES[index]] : undefined,
  };
});

const ALL_CANDIDATES: SeedCandidate[] = [...CANDIDATES, ...BULK];

async function main() {
  const caregiver = await prisma.job.upsert({
    where: { ingestAlias: CAREGIVER_ALIAS },
    update: { title: "Home Health Caregiver", status: "OPEN" },
    create: {
      title: "Home Health Caregiver",
      reqCode: "CARE-001",
      ingestAlias: CAREGIVER_ALIAS,
      status: "OPEN",
    },
  });

  const overnight = await prisma.job.upsert({
    where: { ingestAlias: SECOND_ALIAS },
    update: { title: "Overnight Care Specialist", status: "OPEN" },
    create: {
      title: "Overnight Care Specialist",
      reqCode: "CARE-002",
      ingestAlias: SECOND_ALIAS,
      status: "OPEN",
    },
  });

  for (const person of ALL_CANDIDATES) {
    const candidateId = `seed-cand-${person.key}`;
    const data = {
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      phone: person.phone ? person.phone.replace(/\D/g, "").slice(-10) : null,
      location: person.location,
      currentTitle: person.currentTitle,
      currentEmployer: person.currentEmployer,
    };
    await prisma.candidate.upsert({
      where: { id: candidateId },
      update: data,
      create: { id: candidateId, ...data },
    });

    const applicationId = `seed-app-${person.key}`;
    const appliedAt = daysAgo(person.daysAgo);
    await prisma.application.upsert({
      where: { id: applicationId },
      update: { status: person.status, source: person.source, appliedAt, screening: person.screening ?? Prisma.JsonNull },
      create: {
        id: applicationId,
        candidateId,
        jobId: caregiver.id,
        status: person.status,
        source: person.source,
        screening: person.screening ?? Prisma.JsonNull,
        appliedAt,
      },
    });

    if (person.alsoOvernight) {
      const secondId = `seed-app-${person.key}-b`;
      const secondApplied = daysAgo(person.alsoOvernight.daysAgo);
      await prisma.application.upsert({
        where: { id: secondId },
        update: {
          status: person.alsoOvernight.status,
          source: person.alsoOvernight.source,
          screening: person.alsoOvernight.screening ?? Prisma.JsonNull,
          appliedAt: secondApplied,
        },
        create: {
          id: secondId,
          candidateId,
          jobId: overnight.id,
          status: person.alsoOvernight.status,
          source: person.alsoOvernight.source,
          screening: person.alsoOvernight.screening ?? Prisma.JsonNull,
          appliedAt: secondApplied,
        },
      });
    }

    // Activity shapes copied from the three real call sites:
    //   APPLICATION_CREATED -> { source }   (lib/intake.ts)
    //   STATUS_CHANGED      -> { from, to } (app/actions/application.ts)
    // Candidates without `history` keep a bare timeline, and 13/14 get none at
    // all, so the empty state is reachable.
    if (person.history?.length) {
      await prisma.activity.upsert({
        where: { id: `seed-act-${person.key}-000` },
        update: {},
        create: {
          id: `seed-act-${person.key}-000`,
          candidateId,
          applicationId,
          type: "APPLICATION_CREATED",
          payload: { source: person.source },
          createdAt: appliedAt,
        },
      });

      for (let step = 1; step < person.history.length; step += 1) {
        const id = `seed-act-${person.key}-${String(step).padStart(3, "0")}`;
        await prisma.activity.upsert({
          where: { id },
          update: {},
          create: {
            id,
            candidateId,
            applicationId,
            type: "STATUS_CHANGED",
            payload: { from: person.history[step - 1], to: person.history[step] },
            createdAt: new Date(appliedAt.getTime() + step * DAY),
          },
        });
      }
    }
  }

  await report(caregiver.id);
}

async function report(caregiverJobId: string) {
  const [byStatus, bySource, withPhone, withoutPhone, activities, candidates, applications] =
    await Promise.all([
      prisma.application.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.application.groupBy({ by: ["source"], _count: { _all: true } }),
      prisma.candidate.count({ where: { phone: { not: null } } }),
      prisma.candidate.count({ where: { phone: null } }),
      prisma.activity.count(),
      prisma.candidate.count(),
      prisma.application.count(),
    ]);

  const line = (label: string, value: string | number) =>
    console.log(`  ${label.padEnd(24)}${value}`);

  console.log("\nApplications by status");
  for (const row of byStatus.sort((a, b) => a.status.localeCompare(b.status))) {
    line(row.status, row._count._all);
  }

  console.log("\nApplications by source");
  for (const row of bySource.sort((a, b) => a.source.localeCompare(b.source))) {
    line(row.source, row._count._all);
  }

  console.log("\nCandidates");
  line("with phone", withPhone);
  line("without phone", withoutPhone);
  line("total", candidates);

  console.log("\nTotals");
  line("applications", applications);
  line("on caregiver req", await prisma.application.count({ where: { jobId: caregiverJobId } }));
  line("activity rows", activities);
  line(
    "candidates w/ activity",
    (await prisma.activity.findMany({ distinct: ["candidateId"], select: { candidateId: true } })).length,
  );
  console.log("");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
