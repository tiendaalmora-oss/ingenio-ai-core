import { Contact } from '../../entities/contact.entity';
export declare const CONTACT_REPOSITORY: unique symbol;
export interface IContactRepository {
    save(contact: Contact): Promise<void>;
    findById(id: string): Promise<Contact | null>;
    findByTenant(tenantId: string): Promise<Contact[]>;
}
