import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  ContactListItemView,
  ContactListView,
  ContactView,
} from '../../src/modules/contacts/presentation/contacts.types';
import { ArchiveContactParamsDto } from '../../src/modules/contacts/presentation/dto/archive-contact-params.dto';
import { ContactIdParamsDto } from '../../src/modules/contacts/presentation/dto/contact-id-params.dto';
import { CreateContactDto } from '../../src/modules/contacts/presentation/dto/create-contact.dto';
import { ListContactsQueryDto } from '../../src/modules/contacts/presentation/dto/list-contacts-query.dto';
import { ReactivateContactParamsDto } from '../../src/modules/contacts/presentation/dto/reactivate-contact-params.dto';
import { UpdateContactDto } from '../../src/modules/contacts/presentation/dto/update-contact.dto';

describe('contacts dto and contracts', () => {
  const validObjectId = '507f1f77bcf86cd799439011';

  it('validates and normalizes the create-contact payload', async () => {
    const dto = plainToInstance(CreateContactDto, {
      fullName: '  John Smith  ',
      documentId: ' 12345678900 ',
      phone: ' +5511999999999 ',
      notes: ' School friend ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.fullName).toBe('John Smith');
    expect(dto.documentId).toBe('12345678900');
    expect(dto.phone).toBe('+5511999999999');
    expect(dto.notes).toBe('School friend');
  });

  it('requires at least one mutable field in the update-contact payload', async () => {
    const dto = plainToInstance(UpdateContactDto, {});

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.constraints).toMatchObject({
      atLeastOneField: 'At least one contact field must be provided',
    });
  });

  it('validates the list-contact filters from query params', async () => {
    const dto = plainToInstance(ListContactsQueryDto, {
      status: 'archived',
      search: '  john  ',
      page: '2',
      pageSize: '15',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.status).toBe('archived');
    expect(dto.search).toBe('john');
    expect(dto.page).toBe(2);
    expect(dto.pageSize).toBe(15);
  });

  it('defines controller-facing contact response contracts', () => {
    const item: ContactListItemView = {
      id: 'ctc_1',
      fullName: 'John Smith',
      documentId: '12345678900',
      phone: '+5511999999999',
      notes: 'School friend',
      status: 'active',
      createdAt: new Date('2026-04-23T00:00:00.000Z'),
      updatedAt: new Date('2026-04-23T00:00:00.000Z'),
      archivedAt: null,
    };
    const detail: ContactView = item;
    const list: ContactListView = {
      items: [item],
      page: 1,
      pageSize: 20,
      total: 1,
    };
    const contactIdDto = plainToInstance(ContactIdParamsDto, { contactId: validObjectId });
    const archiveParams = plainToInstance(ArchiveContactParamsDto, {
      contactId: validObjectId,
    });
    const reactivateParams = plainToInstance(ReactivateContactParamsDto, {
      contactId: validObjectId,
    });

    expect(detail.id).toBe('ctc_1');
    expect(list.items).toHaveLength(1);
    expect(contactIdDto.contactId).toBe(validObjectId);
    expect(archiveParams.contactId).toBe(validObjectId);
    expect(reactivateParams.contactId).toBe(validObjectId);
  });
});
