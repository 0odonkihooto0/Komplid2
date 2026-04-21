import type { PrismaTx } from '@/lib/db';

export async function createCompanyWorkspace(
  tx: PrismaTx,
  userId: string,
  organizationId: string,
  organizationName: string
) {
  const slug = generateSlug(organizationName, organizationId);
  const workspace = await tx.workspace.create({
    data: {
      type: 'COMPANY',
      name: organizationName,
      slug,
      organizationId,
      ownerId: userId,
      members: {
        create: { userId, role: 'OWNER' },
      },
    },
  });
  await tx.user.update({ where: { id: userId }, data: { activeWorkspaceId: workspace.id } });
  return workspace;
}

export async function createPersonalWorkspace(
  tx: PrismaTx,
  userId: string,
  firstName: string,
  lastName: string
) {
  const name = `${firstName} ${lastName}`;
  const slug = generateSlug(name, userId);
  const workspace = await tx.workspace.create({
    data: {
      type: 'PERSONAL',
      name,
      slug,
      ownerId: userId,
      members: {
        create: { userId, role: 'OWNER' },
      },
    },
  });
  await tx.user.update({ where: { id: userId }, data: { activeWorkspaceId: workspace.id } });
  return workspace;
}

function generateSlug(name: string, uniquePart: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9а-яёa-z]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
  return `${base}-${uniquePart.slice(-6)}`;
}
