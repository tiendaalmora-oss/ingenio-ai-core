export class Interaction {
  constructor(
    public readonly id: string,
    public readonly conversationId: string,
    public readonly direction: string,
    public readonly type: string,
    public readonly content: string,
    public readonly timestamp: Date,
  ) {}
}
