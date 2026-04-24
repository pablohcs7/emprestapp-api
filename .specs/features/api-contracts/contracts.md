# EmprestApp API Contracts

**Status:** Draft
**Inputs:**

- `.specs/features/domain-core/entities.md`
- `.specs/features/domain-core/lifecycle.md`
- `.specs/features/domain-core/calculations.md`
- `.specs/features/glossary-assumptions/assumptions.md`

---

## Purpose

Define the MVP HTTP contract for the backend API: endpoint structure, request payloads, response shapes, and error semantics.

---

## Global Conventions

### Authentication

- protected endpoints require Bearer JWT access token
- unauthorized access to another user's resource returns `403`

### Response Envelope

Successful responses:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

Error responses:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Friendly message",
    "details": {}
  }
}
```

### Error Object

- `code`: stable internal identifier
- `message`: user-friendly message
- `details`: optional structured validation or context data

### Monetary Representation

- all request and response money fields use integer cents

### Date Representation

- all request and response date fields use ISO 8601 strings

---

## Auth Module

### POST `/auth/register`

Creates a user account and returns an authenticated session.

#### Request

```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "password": "Strong#123"
}
```

#### Validation Rules

- `fullName` required
- `email` required and valid
- `password` required
- password minimum 8 chars
- password must include uppercase and lowercase letters
- password must include at least one special character

#### Success `201`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_123",
      "fullName": "Jane Doe",
      "email": "jane@example.com",
      "status": "active",
      "createdAt": "2026-04-15T18:00:00.000Z"
    },
    "session": {
      "accessToken": "jwt-access",
      "refreshToken": "jwt-refresh",
      "expiresAt": "2026-04-15T19:00:00.000Z"
    }
  },
  "error": null
}
```

#### Errors

- `400` `VALIDATION_ERROR`
- `409` `EMAIL_ALREADY_IN_USE`

---

### POST `/auth/login`

Authenticates the user and creates a new refresh session without invalidating older sessions.

#### Request

```json
{
  "email": "jane@example.com",
  "password": "Strong#123"
}
```

#### Success `200`

Same shape as `/auth/register`.

#### Errors

- `400` `VALIDATION_ERROR`
- `401` `INVALID_CREDENTIALS`

---

### POST `/auth/refresh`

Rotates an access token using an active refresh session.

#### Request

```json
{
  "refreshToken": "jwt-refresh"
}
```

#### Success `200`

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt-access",
    "refreshToken": "jwt-refresh",
    "expiresAt": "2026-04-15T20:00:00.000Z"
  },
  "error": null
}
```

#### Errors

- `400` `VALIDATION_ERROR`
- `401` `INVALID_REFRESH_TOKEN`
- `401` `EXPIRED_REFRESH_TOKEN`

---

## Users Module

### GET `/users/me`

Returns the authenticated user's profile.

#### Success `200`

```json
{
  "success": true,
  "data": {
    "id": "usr_123",
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "status": "active",
    "createdAt": "2026-04-15T18:00:00.000Z"
  },
  "error": null
}
```

---

### GET `/users/me/export?format=json|csv`

Exports user-owned data.

#### Supported Formats

- `json`
- `csv`

#### Export Scope

- user
- contacts
- loans
- installments
- payments

#### Errors

- `400` `INVALID_EXPORT_FORMAT`
- `401` `UNAUTHENTICATED`

---

### DELETE `/users/me`

Logically deletes the account and preserves the data.

#### Success `200`

```json
{
  "success": true,
  "data": {
    "status": "deleted"
  },
  "error": null
}
```

---

## Contacts Module

### POST `/contacts`

Creates a contact.

#### Request

```json
{
  "fullName": "John Smith",
  "documentId": "12345678900",
  "phone": "+5511999999999",
  "notes": "School friend"
}
```

---

### GET `/contacts`

#### Query Params

- `status?=active|archived`
- `search?=text`
- `page?=1`
- `pageSize?=20`

---

### GET `/contacts/:contactId`

#### Errors

- `403` `FORBIDDEN_RESOURCE`
- `404` `CONTACT_NOT_FOUND`

---

### PATCH `/contacts/:contactId`

Updates mutable contact fields.

---

### POST `/contacts/:contactId/archive`

Archives a contact if all linked loans are only `paid` or `canceled`.

#### Errors

- `403` `FORBIDDEN_RESOURCE`
- `404` `CONTACT_NOT_FOUND`
- `422` `CONTACT_HAS_ACTIVE_LOAN`

---

### POST `/contacts/:contactId/reactivate`

Reactivates an archived contact.

---

### DELETE `/contacts/:contactId`

Physically deletes a contact only when it has no linked loans.

#### Errors

- `403` `FORBIDDEN_RESOURCE`
- `404` `CONTACT_NOT_FOUND`
- `422` `CONTACT_HAS_LOAN_HISTORY`

---

## Loans Module

### POST `/loans`

Creates a loan and its installment schedule.

#### Request

```json
{
  "contactId": "ctc_123",
  "principalAmountCents": 100000,
  "interestType": "compound",
  "interestRate": 2.5,
  "startDate": "2026-05-01",
  "installmentPlan": {
    "count": 6
  }
}
```

#### Rules

- `contactId` optional
- when `interestType` is `simple` or `compound`, `interestRate` required
- if no installment plan is given, system creates one implicit installment
- `dueDate` is derived from installment schedule and returned in response

---

### GET `/loans`

#### Query Params

- `status?=open,paid,overdue,canceled`
- `contactId?=ctc_123`
- `dueDateFrom?=2026-05-01`
- `dueDateTo?=2026-11-01`
- `periodFrom?=2026-01-01`
- `periodTo?=2026-12-31`
- `page?=1`
- `pageSize?=20`

#### Behavior

- `canceled` loans are hidden by default
- `canceled` loans appear only when explicitly included in filter

---

### GET `/loans/:loanId`

Returns loan detail including schedule and payment summary.

#### Errors

- `403` `FORBIDDEN_RESOURCE`
- `404` `LOAN_NOT_FOUND`

---

### PATCH `/loans/:loanId/link-contact`

Links or updates `contactId` for an existing loan.

#### Request

```json
{
  "contactId": "ctc_123"
}
```

---

### POST `/loans/:loanId/cancel`

Cancels a loan only when it has no payments.

#### Errors

- `403` `FORBIDDEN_RESOURCE`
- `404` `LOAN_NOT_FOUND`
- `422` `LOAN_HAS_PAYMENTS`

---

### DELETE `/loans/:loanId`

Physically deletes a loan only when it has no payments.

#### Errors

- `403` `FORBIDDEN_RESOURCE`
- `404` `LOAN_NOT_FOUND`
- `422` `LOAN_HAS_PAYMENTS`

---

## Payments Module

### POST `/payments`

Registers a payment against the next open installment of a loan.

#### Request

```json
{
  "loanId": "loan_123",
  "installmentId": "inst_003",
  "amountCents": 5000,
  "paidAt": "2026-08-01",
  "method": "pix",
  "note": "Partial payment"
}
```

#### Rules

- `paidAt` must be today or in the past
- payment must target the next open installment only
- partial payment is allowed
- installment stays `pending` or `overdue` until fully paid
- overpayment is invalid

#### Errors

- `400` `VALIDATION_ERROR`
- `403` `FORBIDDEN_RESOURCE`
- `404` `LOAN_NOT_FOUND`
- `404` `INSTALLMENT_NOT_FOUND`
- `422` `INVALID_PAYMENT_AMOUNT`
- `422` `INVALID_PAYMENT_SEQUENCE`
- `422` `LOAN_CANCELED`

---

### GET `/payments`

#### Query Params

- `loanId?=loan_123`
- `installmentId?=inst_003`
- `status?=active,canceled`
- `paidAtFrom?=2026-01-01`
- `paidAtTo?=2026-12-31`
- `page?=1`
- `pageSize?=20`

---

### GET `/loans/:loanId/payments`

Lists payment history for one loan.

---

### POST `/payments/:paymentId/cancel`

Cancels an existing payment and recalculates the installment and loan states.

#### Errors

- `403` `FORBIDDEN_RESOURCE`
- `404` `PAYMENT_NOT_FOUND`
- `422` `PAYMENT_ALREADY_CANCELED`

---

## Dashboard Module

### GET `/dashboard/summary`

Returns the minimum MVP financial summary.

### GET `/dashboard/history`

Returns a lender-focused history list with filters.

#### Query Params

- `status?=open,paid,overdue,canceled`
- `contactId?=ctc_123`
- `dueDateFrom?=2026-01-01`
- `dueDateTo?=2026-12-31`
- `periodFrom?=2026-01-01`
- `periodTo?=2026-12-31`
- `page?=1`
- `pageSize?=20`

---

## Common Error Catalog

### Validation

- `VALIDATION_ERROR`
- `INVALID_EXPORT_FORMAT`

### Authentication and Authorization

- `UNAUTHENTICATED`
- `INVALID_CREDENTIALS`
- `INVALID_REFRESH_TOKEN`
- `EXPIRED_REFRESH_TOKEN`
- `FORBIDDEN_RESOURCE`

### Users

- `EMAIL_ALREADY_IN_USE`

### Contacts

- `CONTACT_NOT_FOUND`
- `CONTACT_HAS_ACTIVE_LOAN`
- `CONTACT_HAS_LOAN_HISTORY`

### Loans

- `LOAN_NOT_FOUND`
- `LOAN_HAS_PAYMENTS`
- `LOAN_CANCELED`

### Installments

- `INSTALLMENT_NOT_FOUND`

### Payments

- `PAYMENT_NOT_FOUND`
- `INVALID_PAYMENT_AMOUNT`
- `INVALID_PAYMENT_SEQUENCE`
- `PAYMENT_ALREADY_CANCELED`

---

## Deferred Contract Decisions

These are not open business-policy questions, but they still need technical refinement in the next iteration:

- exact DTO field limits and string length rules
- exact pagination metadata shape
- exact JSON export shape and CSV packaging strategy
- whether dashboard history is its own projection endpoint or reuses loans listing internally
