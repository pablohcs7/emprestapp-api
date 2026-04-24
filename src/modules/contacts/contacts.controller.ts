import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthTokenPayload } from '../auth/token.service';
import {
  ContactAccessError,
  ContactNotFoundError,
  ContactsApplicationService,
} from './application/contacts.application.service';
import {
  ContactHasActiveLoanError,
  ContactHasLoanHistoryError,
  ContactLifecyclePolicyError,
  ContactLifecyclePolicyService,
  ForbiddenContactResourceError as LifecycleForbiddenContactResourceError,
} from './application/contact-lifecycle-policy.service';
import { ArchiveContactParamsDto } from './presentation/dto/archive-contact-params.dto';
import { ContactIdParamsDto } from './presentation/dto/contact-id-params.dto';
import { CreateContactDto } from './presentation/dto/create-contact.dto';
import { ListContactsQueryDto } from './presentation/dto/list-contacts-query.dto';
import { ReactivateContactParamsDto } from './presentation/dto/reactivate-contact-params.dto';
import { UpdateContactDto } from './presentation/dto/update-contact.dto';

@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(
    private readonly contactsApplicationService: ContactsApplicationService,
    private readonly contactLifecyclePolicyService: ContactLifecyclePolicyService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthTokenPayload,
    @Body() input: CreateContactDto,
  ) {
    return this.contactsApplicationService.create(user.sub, input);
  }

  @Get()
  list(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: ListContactsQueryDto,
  ) {
    return this.contactsApplicationService.list(user.sub, query);
  }

  @Get(':contactId')
  async detail(
    @CurrentUser() user: AuthTokenPayload,
    @Param() params: ContactIdParamsDto,
  ) {
    try {
      return await this.contactsApplicationService.detail(
        user.sub,
        params.contactId,
      );
    } catch (error) {
      throw mapContactErrorToHttpException(error);
    }
  }

  @Patch(':contactId')
  async update(
    @CurrentUser() user: AuthTokenPayload,
    @Param() params: ContactIdParamsDto,
    @Body() input: UpdateContactDto,
  ) {
    try {
      return await this.contactsApplicationService.update(
        user.sub,
        params.contactId,
        input,
      );
    } catch (error) {
      throw mapContactErrorToHttpException(error);
    }
  }

  @Post(':contactId/archive')
  @HttpCode(200)
  async archive(
    @CurrentUser() user: AuthTokenPayload,
    @Param() params: ArchiveContactParamsDto,
  ) {
    try {
      return await this.contactLifecyclePolicyService.archiveContact(
        user.sub,
        params.contactId,
      );
    } catch (error) {
      throw mapContactErrorToHttpException(error);
    }
  }

  @Post(':contactId/reactivate')
  @HttpCode(200)
  async reactivate(
    @CurrentUser() user: AuthTokenPayload,
    @Param() params: ReactivateContactParamsDto,
  ) {
    try {
      return await this.contactLifecyclePolicyService.reactivateContact(
        user.sub,
        params.contactId,
      );
    } catch (error) {
      throw mapContactErrorToHttpException(error);
    }
  }

  @Delete(':contactId')
  @HttpCode(200)
  async delete(
    @CurrentUser() user: AuthTokenPayload,
    @Param() params: ContactIdParamsDto,
  ) {
    try {
      await this.contactLifecyclePolicyService.deleteContact(
        user.sub,
        params.contactId,
      );

      return {
        deleted: true,
      };
    } catch (error) {
      throw mapContactErrorToHttpException(error);
    }
  }
}

const mapContactErrorToHttpException = (error: unknown): Error => {
  if (
    error instanceof ContactNotFoundError ||
    (error instanceof ContactLifecyclePolicyError &&
      error.code === 'CONTACT_NOT_FOUND')
  ) {
    return new NotFoundException({
      code: 'CONTACT_NOT_FOUND',
      message: 'Contact not found',
    });
  }

  if (
    error instanceof ContactAccessError ||
    error instanceof LifecycleForbiddenContactResourceError
  ) {
    return new ForbiddenException({
      code: 'FORBIDDEN_RESOURCE',
      message: 'Forbidden resource',
    });
  }

  if (error instanceof ContactHasActiveLoanError) {
    return new UnprocessableEntityException({
      code: 'CONTACT_HAS_ACTIVE_LOAN',
      message: error.message,
    });
  }

  if (error instanceof ContactHasLoanHistoryError) {
    return new UnprocessableEntityException({
      code: 'CONTACT_HAS_LOAN_HISTORY',
      message: error.message,
    });
  }

  return error instanceof Error ? error : new Error('Unexpected contact error');
};
