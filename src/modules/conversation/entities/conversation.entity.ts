export class Conversation {
  constructor(
    public readonly id: string,
    public readonly contactId: string,
    public status: string,
  ) {}

  updateStatus(newStatus: string) {
    this.status = newStatus;
  }
}
