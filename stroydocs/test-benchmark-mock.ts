async function runBenchmark() {
  const selectedWorkItems = Array.from({ length: 100 }).map((_, i) => ({
    id: `work_${i}`,
    rawName: `Work ${i}`,
    rawUnit: 'шт',
    volume: 10,
    normativeRefs: ['ref1', 'ref2']
  }));

  const allMaterialItems = Array.from({ length: 200 }).map((_, i) => ({
    id: `mat_${i}`,
    rawName: `Material ${i}`,
    rawUnit: 'шт',
    volume: 5,
    parentItemId: `work_${Math.floor(i / 2)}`
  }));

  // mock DB
  class DB {
    queries = 0;

    async count() {
      this.queries++;
      await this.sleep(1);
      return 100;
    }

    async create() {
      this.queries++;
      await this.sleep(2);
      return { id: `id_${Math.random()}` };
    }

    async createMany() {
      this.queries++;
      await this.sleep(5);
    }

    async update() {
      this.queries++;
      await this.sleep(2);
    }

    async sleep(ms: number) {
      return new Promise(r => setTimeout(r, ms));
    }
  }

  const db = new DB();

  // Baseline implementation simulation
  db.queries = 0;
  const start = performance.now();

  const existingCount = await db.count();
  let itemIndex = 0;

  for (const item of selectedWorkItems) {
    itemIndex++;

    const workItem = await db.create();
    await db.update(); // estimateImportItem update

    const childMaterials = allMaterialItems.filter((m) => m.parentItemId === item.id);
    for (const mat of childMaterials) {
      await db.create(); // material
      await db.update(); // estimateImportItem update
    }

    if (childMaterials.length === 0) {
      await db.create(); // material
    }
  }
  await db.update(); // estimateImport update

  const end = performance.now();
  console.log(`Original implementation took ${end - start}ms with ${db.queries} queries`);

  // Optimized implementation simulation
  db.queries = 0;
  const startOpt = performance.now();

  const existingCountOpt = await db.count();

  await db.createMany(); // all work items

  const updates = [];
  let materialsCount = 0;

  for (const item of selectedWorkItems) {
    updates.push(db.update()); // estimateImportItem

    const childMaterials = allMaterialItems.filter((m) => m.parentItemId === item.id);
    for (const mat of childMaterials) {
      materialsCount++;
      updates.push(db.update()); // estimateImportItem
    }

    if (childMaterials.length === 0) {
      materialsCount++;
    }
  }

  if (materialsCount > 0) {
    await db.createMany(); // materials
  }

  await Promise.all(updates);
  await db.update(); // estimateImport

  const endOpt = performance.now();
  console.log(`Optimized implementation took ${endOpt - startOpt}ms with ${db.queries} queries`);
}

runBenchmark().catch(console.error);
