export class PaymentRequiredError extends Error {
  constructor(
    public readonly feature: string,
    public readonly workspaceId: string,
    public readonly upgradePlanCode?: string
  ) {
    super(`Feature "${feature}" requires upgrade`);
    this.name = 'PaymentRequiredError';
  }
}

export class LimitExceededError extends Error {
  constructor(
    public readonly limitKey: string,
    public readonly limit: number,
    public readonly current: number,
    public readonly workspaceId: string
  ) {
    super(`Limit "${limitKey}" exceeded (${current}/${limit})`);
    this.name = 'LimitExceededError';
  }
}
