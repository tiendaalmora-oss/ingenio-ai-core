export class Contact {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly name: string,
    public readonly phone?: string | null,
  ) {}
}
