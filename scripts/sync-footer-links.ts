/**
 * Converges the footer navigation on the canonical set in prisma/footer-links.ts.
 *
 * DESTRUCTIVE: footer groups and links outside that set are deleted, so footer
 * edits made in the admin are discarded. Run it deliberately — `pnpm footer:sync`
 * — never as part of boot. ensure-cms.ts uses the additive variant instead.
 */
import { syncFooterLinkGroups } from "../prisma/footer-links";
import { prisma } from "../src/lib/prisma";

async function printFooter(label: string): Promise<void> {
  const groups = await prisma.footerLinkGroup.findMany({
    include: { links: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" }
  });

  console.log(`\n${label}`);

  if (groups.length === 0) {
    console.log("  (no footer link groups)");
    return;
  }

  for (const group of groups) {
    console.log(`  ${group.heading}`);
    for (const link of group.links) {
      console.log(`    ${link.label}  ->  ${link.href}`);
    }
  }
}

async function main(): Promise<void> {
  await printFooter("BEFORE:");
  await syncFooterLinkGroups(prisma);
  await printFooter("AFTER:");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
