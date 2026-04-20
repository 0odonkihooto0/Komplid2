import { performance } from 'perf_hooks';

// We mock the update operation since setting up a fully seeded DB for the benchmark is complex.
// The bottleneck here is the DB I/O which we will mock.
// A real DB I/O would take roughly 1ms - 5ms depending on the load and distance.
async function mockUpdateConcurrently(updates: any[]) {
  return Promise.all(
    updates.map(u => {
      return new Promise(resolve => setTimeout(resolve, 5)); // Simulate 5ms DB operation
    })
  );
}

async function mockUpdateSequentially(updates: any[]) {
  for (const u of updates) {
    await new Promise(resolve => setTimeout(resolve, 5)); // Simulate 5ms DB operation
  }
}

async function run() {
  const updates = Array.from({ length: 100 }, (_, i) => ({ id: i }));

  const startSeq = performance.now();
  await mockUpdateSequentially(updates);
  const endSeq = performance.now();

  const startConc = performance.now();
  await mockUpdateConcurrently(updates);
  const endConc = performance.now();

  const seqTime = (endSeq - startSeq).toFixed(2);
  const concTime = (endConc - startConc).toFixed(2);

  console.log(`[Benchmark] Mocking 100 Gantt Task updates`);
  console.log(`Sequential time (Baseline): ${seqTime}ms`);
  console.log(`Concurrent time (Optimized): ${concTime}ms`);
  console.log(`Improvement factor: ${(Number(seqTime) / Number(concTime)).toFixed(2)}x faster`);
}

run();
