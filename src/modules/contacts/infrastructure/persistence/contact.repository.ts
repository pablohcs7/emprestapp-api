import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';

import { ContactRepository } from '../../domain/contact.repository';
import {
  Contact,
  ContactListFilters,
  ContactListResult,
  CreateContactRecord,
} from '../../domain/contact.types';
import {
  ContactDocument,
  ContactModelDocument,
} from './contact.schema';

const normalizeText = (value: string): string => value.trim();

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toContact = (document: ContactModelDocument): Contact => ({
  id: document._id.toString(),
  userId: document.userId.toString(),
  fullName: document.fullName,
  documentId: document.documentId ?? null,
  phone: document.phone ?? null,
  notes: document.notes ?? null,
  status: document.status,
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
  archivedAt: document.archivedAt ?? null,
});

@Injectable()
export class MongooseContactRepository implements ContactRepository {
  constructor(
    @InjectModel(ContactDocument.name)
    private readonly contactModel: Model<ContactDocument>,
  ) {}

  async create(input: CreateContactRecord): Promise<Contact> {
    const created = await this.contactModel.create({
      userId: new Types.ObjectId(input.userId),
      fullName: normalizeText(input.fullName),
      documentId: input.documentId ? normalizeText(input.documentId) : null,
      phone: input.phone ? normalizeText(input.phone) : null,
      notes: input.notes ? normalizeText(input.notes) : null,
      status: 'active',
      archivedAt: null,
    });

    return toContact(created as ContactModelDocument);
  }

  async findById(contactId: string): Promise<Contact | null> {
    const document = await this.contactModel.findById(contactId);

    return document ? toContact(document as ContactModelDocument) : null;
  }

  async findByIdForUser(contactId: string, userId: string): Promise<Contact | null> {
    const document = await this.contactModel.findOne({
      _id: contactId,
      userId: new Types.ObjectId(userId),
    });

    return document ? toContact(document as ContactModelDocument) : null;
  }

  async listForUser(
    userId: string,
    filters: ContactListFilters,
  ): Promise<ContactListResult> {
    const query: FilterQuery<ContactDocument> = {
      userId: new Types.ObjectId(userId),
    };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.search) {
      query.fullName = {
        $regex: escapeRegex(filters.search),
        $options: 'i',
      };
    }

    const [items, total] = await Promise.all([
      this.contactModel
        .find(query)
        .sort({ fullName: 1 })
        .skip((filters.page - 1) * filters.pageSize)
        .limit(filters.pageSize),
      this.contactModel.countDocuments(query),
    ]);

    return {
      items: items.map((item) => toContact(item as ContactModelDocument)),
      total,
    };
  }

  async update(contact: Contact): Promise<Contact> {
    const updated = await this.contactModel.findOneAndUpdate(
      {
        _id: contact.id,
        userId: new Types.ObjectId(contact.userId),
      },
      {
        fullName: normalizeText(contact.fullName),
        documentId: contact.documentId ? normalizeText(contact.documentId) : null,
        phone: contact.phone ? normalizeText(contact.phone) : null,
        notes: contact.notes ? normalizeText(contact.notes) : null,
        status: contact.status,
        archivedAt: contact.archivedAt ?? null,
      },
      { returnDocument: 'after' },
    );

    if (!updated) {
      throw new Error(`Contact not found: ${contact.id}`);
    }

    return toContact(updated as ContactModelDocument);
  }

  async archive(
    contactId: string,
    userId: string,
    archivedAt: Date,
  ): Promise<Contact | null> {
    const updated = await this.contactModel.findOneAndUpdate(
      {
        _id: contactId,
        userId: new Types.ObjectId(userId),
      },
      {
        status: 'archived',
        archivedAt,
      },
      { returnDocument: 'after' },
    );

    return updated ? toContact(updated as ContactModelDocument) : null;
  }

  async reactivate(contactId: string, userId: string): Promise<Contact | null> {
    const updated = await this.contactModel.findOneAndUpdate(
      {
        _id: contactId,
        userId: new Types.ObjectId(userId),
      },
      {
        status: 'active',
        archivedAt: null,
      },
      { returnDocument: 'after' },
    );

    return updated ? toContact(updated as ContactModelDocument) : null;
  }

  async delete(contactId: string, userId: string): Promise<boolean> {
    const result = await this.contactModel.deleteOne({
      _id: contactId,
      userId: new Types.ObjectId(userId),
    });

    return result.deletedCount === 1;
  }
}
