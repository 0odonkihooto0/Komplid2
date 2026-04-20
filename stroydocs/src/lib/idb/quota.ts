export async function getStorageEstimate() {
  if (!navigator.storage?.estimate) return null;
  const estimate = await navigator.storage.estimate();
  return {
    usage: estimate.usage ?? 0,
    quota: estimate.quota ?? 0,
    percent: estimate.quota
      ? Math.round(((estimate.usage ?? 0) / estimate.quota) * 100)
      : 0,
  };
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  const isPersisted = await navigator.storage.persisted();
  if (isPersisted) return true;
  return await navigator.storage.persist();
}
