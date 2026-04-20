## 2024-05-19 - Prisma bulk update N+1 problem
**Learning:** Found sequential `await tx.ganttTask.update(...)` inside a `for (const u of updates)` loop within a transaction. This executes queries sequentially, causing an N+1 problem. Prisma's documentation and our memory guide specifically suggest using `Promise.all` or passing an array of update promises directly to `db.$transaction([])` for better performance.
**Action:** Replace `for...of` loops with array mapping directly inside `$transaction()` or `Promise.all(updates.map(...))` to parallelize database calls within the transaction.
