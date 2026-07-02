import { Contact } from '../../entities/contact.entity';

export const CONTACT_REPOSITORY = Symbol('CONTACT_REPOSITORY');

export interface IContactRepository {
  save(contact: Contact): Promise<void>;
  findById(id: string): Promise<Contact | null>;
  findByTenant(tenantId: string): Promise<Contact[]>;
}
