import { db } from './src/lib/db';
import { MeasurementUnit } from '@prisma/client';

async function main() {
  const org = await db.organization.create({
    data: {
      name: 'Test Org',
      inn: '1234567890',
    }
  });

  const user = await db.user.create({
    data: {
      email: 'test' + Date.now() + '@test.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: '123456',
      organizationId: org.id,
    }
  });

  const contract = await db.contract.create({
    data: {
      name: 'Test Contract',
      number: '123',
      status: 'DRAFT',
      buildingObject: {
        create: {
          name: 'Test Project',
          address: 'Test Address',
          organizationId: org.id,
        }
      }
    }
  });

  const estimateImport = await db.estimateImport.create({
    data: {
      contractId: contract.id,
      createdById: user.id,
      fileName: 'test.xlsx',
      fileS3Key: 'test.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 1024,
      status: 'PREVIEW',
      items: {
        createMany: {
          data: Array.from({ length: 100 }).map((_, i) => ({
            rawName: `Work ${i}`,
            itemType: 'WORK',
            sortOrder: i * 2,
            contractId: contract.id,
          }))
        }
      }
    }
  });

  const createdItems = await db.estimateImportItem.findMany({
    where: { importId: estimateImport.id, itemType: 'WORK' },
    orderBy: { sortOrder: 'asc' }
  });

  const materialsData = createdItems.map((item, i) => ({
    rawName: `Material ${i}`,
    itemType: 'MATERIAL',
    sortOrder: i * 2 + 1,
    contractId: contract.id,
    importId: estimateImport.id,
    parentItemId: item.id,
  }));

  await db.estimateImportItem.createMany({ data: materialsData as any });

  const allItems = await db.estimateImportItem.findMany({
    where: { importId: estimateImport.id },
    orderBy: { sortOrder: 'asc' }
  });

  const selectedWorkItems = allItems.filter(i => i.itemType === 'WORK');
  const allMaterialItems = allItems.filter(i => i.itemType === 'MATERIAL');

  const start = performance.now();

  const result = await db.$transaction(async (tx) => {
    const existingCount = await tx.workItem.count({
      where: { contractId: contract.id },
    });

    const createdWorkItems = [];
    let itemIndex = 0;

    for (const item of selectedWorkItems) {
      itemIndex++;
      const cipher = `СМТ-${String(existingCount + itemIndex).padStart(3, '0')}`;

      const workItem = await tx.workItem.create({
        data: {
          projectCipher: cipher,
          name: item.rawName,
          unit: item.rawUnit ?? undefined,
          volume: item.volume ?? undefined,
          normatives: item.normativeRefs?.length ? item.normativeRefs.join(', ') : undefined,
          ksiNodeId: undefined,
          contractId: contract.id,
        },
      });

      await tx.estimateImportItem.update({
        where: { id: item.id },
        data: {
          status: 'CONFIRMED',
          workItemId: workItem.id,
        },
      });

      const childMaterials = allMaterialItems.filter((m) => m.parentItemId === item.id);
      for (const mat of childMaterials) {
        await tx.material.create({
          data: {
            name: mat.rawName,
            unit: MeasurementUnit.PIECE,
            quantityReceived: mat.volume ?? 0,
            contractId: contract.id,
            workItemId: workItem.id,
          },
        });

        await tx.estimateImportItem.update({
          where: { id: mat.id },
          data: { status: 'CONFIRMED' },
        });
      }

      if (childMaterials.length === 0) {
        await tx.material.create({
          data: {
            name: item.rawName,
            unit: MeasurementUnit.PIECE,
            quantityReceived: item.volume ?? 0,
            contractId: contract.id,
            workItemId: workItem.id,
          },
        });
      }

      createdWorkItems.push(workItem);
    }

    await tx.estimateImport.update({
      where: { id: estimateImport.id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });

    return createdWorkItems;
  });

  const end = performance.now();
  console.log(`Original implementation took ${end - start}ms`);

  // Benchmark the optimized one
  const startOptimized = performance.now();

  const resultOptimized = await db.$transaction(async (tx) => {
    const existingCount = await tx.workItem.count({
      where: { contractId: contract.id },
    });

    let itemIndex = 0;
    const workItemsData = selectedWorkItems.map((item) => {
      itemIndex++;
      const cipher = `СМТ-${String(existingCount + itemIndex).padStart(3, '0')}`;
      return {
        id: crypto.randomUUID(), // pre-generate IDs to link materials
        projectCipher: cipher,
        name: item.rawName,
        unit: item.rawUnit ?? undefined,
        volume: item.volume ?? undefined,
        normatives: item.normativeRefs?.length ? item.normativeRefs.join(', ') : undefined,
        ksiNodeId: undefined,
        contractId: contract.id,
        // we'll need to remember the item.id to link it up
        _originalItemId: item.id,
      };
    });

    await tx.workItem.createMany({
      data: workItemsData.map(({ _originalItemId, ...rest }) => rest),
    });

    const materialsDataToCreate = [];
    const itemUpdates = [];

    for (const workItemData of workItemsData) {
      const originalItemId = workItemData._originalItemId;
      const workItemId = workItemData.id;

      itemUpdates.push(
        tx.estimateImportItem.update({
          where: { id: originalItemId },
          data: {
            status: 'CONFIRMED',
            workItemId: workItemId,
          },
        })
      );

      const childMaterials = allMaterialItems.filter((m) => m.parentItemId === originalItemId);
      for (const mat of childMaterials) {
        materialsDataToCreate.push({
          name: mat.rawName,
          unit: MeasurementUnit.PIECE,
          quantityReceived: mat.volume ?? 0,
          contractId: contract.id,
          workItemId: workItemId,
        });

        itemUpdates.push(
          tx.estimateImportItem.update({
            where: { id: mat.id },
            data: { status: 'CONFIRMED' },
          })
        );
      }

      if (childMaterials.length === 0) {
        materialsDataToCreate.push({
          name: workItemData.name,
          unit: MeasurementUnit.PIECE,
          quantityReceived: workItemData.volume ?? 0,
          contractId: contract.id,
          workItemId: workItemId,
        });
      }
    }

    if (materialsDataToCreate.length > 0) {
      await tx.material.createMany({
        data: materialsDataToCreate,
      });
    }

    await Promise.all(itemUpdates);

    await tx.estimateImport.update({
      where: { id: estimateImport.id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });

    return workItemsData;
  });

  const endOptimized = performance.now();
  console.log(`Optimized implementation took ${endOptimized - startOptimized}ms`);

  // Cleanup
  await db.contract.delete({ where: { id: contract.id } });
  await db.organization.deleteMany({ where: { inn: '1234567890' } });
  await db.user.delete({ where: { id: user.id } });
}

main().catch(console.error).finally(() => db.$disconnect());
