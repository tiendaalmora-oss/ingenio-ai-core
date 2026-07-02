import { IContactRepository } from '../ports/out/contact-repository.interface';
import { Contact } from '../entities/contact.entity';
import { PrismaService } from '../../../shared/database/prisma.service';
export declare class PrismaContactRepository implements IContactRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    save(contact: Contact): Promise<void>;
    findById(id: string): Promise<Contact | null>;
    findByTenant(tenantId: string): Promise<Contact[]>;
}
