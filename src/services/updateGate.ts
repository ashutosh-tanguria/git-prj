const lockName = "shelf-active-delivery";
let deliveries = 0;

export async function keepAppRunning<T>(action: () => Promise<T>) {
  deliveries++;
  try {
    return navigator.locks
      ? await navigator.locks.request(lockName, { mode: "shared" }, action)
      : await action();
  } finally {
    deliveries--;
  }
}

export async function whenDeliveryIdle(action: () => Promise<void>) {
  if (deliveries) return false;
  if (!navigator.locks) return false;
  return navigator.locks.request(
    lockName,
    { ifAvailable: true },
    async (lock) => {
      if (!lock || deliveries) return false;
      await action();
      return true;
    },
  );
}
