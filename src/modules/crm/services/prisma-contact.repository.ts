import { Injectable } from '@nestjs/common';
import { IContactRepository } from '../ports/out/contact-repository.interface';
import { Contact } from '../entities/contact.entity';
import { PrismaService } from '../../../shared/database/prisma.service';

@Injectable()
export class PrismaContactRepository implements IContactRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(contact: Contact): Promise<void> {
    await this.prisma.contact.upsert({
      where: { id: contact.id },
      update: {
        name: contact.name,
        phone: contact.phone,
        phoneNormalized: contact.phoneNormalized,
        externalId: contact.externalId,
      },
      create: {
        id: contact.id,
        tenantId: contact.tenantId,
        name: contact.name,
        phone: contact.phone,
        phoneNormalized: contact.phoneNormalized,
        externalId: contact.externalId,
      },
    });
  }

  async findById(id: string): Promise<Contact | null> {
    const raw = await this.prisma.contact.findUnique({ where: { id } });
    if (!raw) return null;
    return new Contact(raw.id, raw.tenantId, raw.name, raw.phone, raw.phoneNormalized, raw.externalId);
  }

  async findByTenant(tenantId: string): Promise<Contact[]> {
    const rawList = await this.prisma.contact.findMany({ where: { tenantId } });
    return rawList.map(raw => new Contact(raw.id, raw.tenantId, raw.name, raw.phone, raw.phoneNormalized, raw.externalId));
  }
}
