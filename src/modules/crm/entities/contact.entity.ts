export class Contact {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly name: string,
    public readonly phone?: string | null,
    public readonly phoneNormalized?: string | null,
    public readonly externalId?: string | null,
  ) {}
}
