import { prisma } from "../../config/database.js";
import { Prisma } from "../../generated/prisma/client.js";
import type { AuthenticatedRequestContext } from "../../shared/http/auth-context.js";

import type {
  CustomerCreateInput,
  CustomerUpdateInput,
} from "./customer.schema.js";

const customerSelect = {
  id: true,
  name: true,
  registrationNumber: true,
  contactPerson: true,
  email: true,
  phone: true,
  billingAddress: true,
  shippingAddress: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CustomerSelect;

export class CustomerNotFoundError extends Error {
  constructor() {
    super("Customer was not found");
    this.name = "CustomerNotFoundError";
  }
}

function isRecordNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

export function listCustomers(auth: AuthenticatedRequestContext) {
  return prisma.customer.findMany({
    where: { companyId: auth.companyId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: customerSelect,
  });
}

export async function getCustomer(
  auth: AuthenticatedRequestContext,
  customerId: string,
) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId: auth.companyId },
    select: customerSelect,
  });

  if (!customer) {
    throw new CustomerNotFoundError();
  }

  return customer;
}

export function createCustomer(
  auth: AuthenticatedRequestContext,
  input: CustomerCreateInput,
) {
  return prisma.customer.create({
    data: {
      companyId: auth.companyId,
      name: input.name,
      registrationNumber: input.registrationNumber ?? null,
      contactPerson: input.contactPerson ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      billingAddress: input.billingAddress ?? null,
      shippingAddress: input.shippingAddress ?? null,
      notes: input.notes ?? null,
    },
    select: customerSelect,
  });
}

export async function updateCustomer(
  auth: AuthenticatedRequestContext,
  customerId: string,
  input: CustomerUpdateInput,
) {
  const existingCustomer = await getCustomer(auth, customerId);

  if (Object.keys(input).length === 0) {
    return existingCustomer;
  }

  try {
    return await prisma.customer.update({
      where: {
        id_companyId: { id: customerId, companyId: auth.companyId },
      },
      data: input,
      select: customerSelect,
    });
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      throw new CustomerNotFoundError();
    }

    throw error;
  }
}

export async function archiveCustomer(
  auth: AuthenticatedRequestContext,
  customerId: string,
) {
  const customer = await getCustomer(auth, customerId);

  if (!customer.isActive) {
    return customer;
  }

  try {
    return await prisma.customer.update({
      where: {
        id_companyId: { id: customerId, companyId: auth.companyId },
      },
      data: { isActive: false },
      select: customerSelect,
    });
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      throw new CustomerNotFoundError();
    }

    throw error;
  }
}
