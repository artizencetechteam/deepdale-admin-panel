import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Canonical footer navigation.
 *
 * Mirrors FALLBACK_LINK_GROUPS in the frontend's SiteFooterSection so the CMS
 * renders the same footer the hardcoded fallback does. Kept verbatim — including
 * the trailing space in "AI Automation " — so the two stay byte-identical.
 */
export const FOOTER_LINK_GROUPS: Array<{
  heading: string;
  links: Array<{ label: string; href: string }>;
}> = [
  {
    heading: "Product",
    links: [
      { label: "AI Voice Agent", href: "/AI Voice Agent" },
      { label: "AI Automation ", href: "/AI Automation " }
    ]
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" }
    ]
  },
  {
    heading: "Resources",
    links: [
      { label: "Help Center", href: "/help-center" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms & Conditions", href: "/terms-and-conditions" }
    ]
  }
];

type FooterClient = PrismaClient | Prisma.TransactionClient;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Deterministic ids let the seed converge on re-runs instead of appending a
 * duplicate set every time, without needing a unique constraint on `heading`.
 */
export function footerGroupId(heading: string): string {
  return `footer_group_${slugify(heading)}`;
}

export function footerLinkId(groupId: string, index: number): string {
  return `${groupId}_link_${index}`;
}

/**
 * Converges the footer to exactly FOOTER_LINK_GROUPS: removes groups and links
 * that are not part of the canonical set and upserts the ones that are.
 *
 * Destructive — it discards footer edits made in the admin. Use it for a full
 * reseed or a deliberate one-off reset, never on every boot.
 */
export async function syncFooterLinkGroups(client: PrismaClient): Promise<void> {
  const groups = FOOTER_LINK_GROUPS.map((group, groupIndex) => ({
    id: footerGroupId(group.heading),
    heading: group.heading,
    sortOrder: groupIndex
  }));

  const links = FOOTER_LINK_GROUPS.flatMap((group) => {
    const groupId = footerGroupId(group.heading);

    return group.links.map((link, linkIndex) => ({
      id: footerLinkId(groupId, linkIndex),
      footerLinkGroupId: groupId,
      label: link.label,
      href: link.href,
      sortOrder: linkIndex
    }));
  });

  // Ids are deterministic, so clearing and recreating converges on the same rows
  // every run. Three statements keeps this well inside the interactive
  // transaction timeout — per-row upserts against a remote database did not.
  await client.$transaction([
    client.footerLinkGroup.deleteMany({}), // links cascade
    client.footerLinkGroup.createMany({ data: groups }),
    client.footerLink.createMany({ data: links })
  ]);
}

/**
 * Additive counterpart to syncFooterLinkGroups: creates canonical groups and
 * links that are missing and touches nothing else.
 *
 * Safe to run on every boot — re-running it is a no-op once the set exists, and
 * it never overwrites or deletes what an editor changed in the admin.
 *
 * Returns the number of rows created.
 */
export async function ensureFooterLinkGroups(
  client: FooterClient
): Promise<number> {
  let created = 0;

  for (const [groupIndex, group] of FOOTER_LINK_GROUPS.entries()) {
    const groupId = footerGroupId(group.heading);
    const existingGroup = await client.footerLinkGroup.findUnique({
      where: { id: groupId }
    });

    if (!existingGroup) {
      await client.footerLinkGroup.create({
        data: { id: groupId, heading: group.heading, sortOrder: groupIndex }
      });
      created += 1;
    }

    for (const [linkIndex, link] of group.links.entries()) {
      const linkId = footerLinkId(groupId, linkIndex);
      const existingLink = await client.footerLink.findUnique({
        where: { id: linkId }
      });

      if (!existingLink) {
        await client.footerLink.create({
          data: {
            id: linkId,
            footerLinkGroupId: groupId,
            label: link.label,
            href: link.href,
            sortOrder: linkIndex
          }
        });
        created += 1;
      }
    }
  }

  return created;
}
