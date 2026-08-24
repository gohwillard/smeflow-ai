import { prisma } from "../../config/database.js";
import { Prisma } from "../../generated/prisma/client.js";
import type { AuthenticatedRequestContext } from "../../shared/http/auth-context.js";

import type {
  SupplierCreateInput,
  SupplierUpdateInput,
} from "./supplier.schema.js";

const supplierSelect = {
  id: true,
  name: true,
  registrationNumber: true,
  contactPerson: true,
  email: true,
  phone: true,
  address: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SupplierSelect;

export class SupplierNotFoundError extends Error {
  constructor() {
    super("Supplier was not found");
    this.name = "SupplierNotFoundError";
  }
}

function isRecordNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

export function listSuppliers(auth: AuthenticatedRequestContext) {
  return prisma.supplier.findMany({
    where: { companyId: auth.companyId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: supplierSelect,
  });
}

export async function getSupplier(
  auth: AuthenticatedRequestContext,
  supplierId: string,
) {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, companyId: auth.companyId },
    select: supplierSelect,
  });

  if (!supplier) {
    throw new SupplierNotFoundError();
  }

  return supplier;
}

export function createSupplier(
  auth: AuthenticatedRequestContext,
  input: SupplierCreateInput,
) {
  return prisma.supplier.create({
    data: {
      companyId: auth.companyId,
      name: input.name,
      registrationNumber: input.registrationNumber ?? null,
      contactPerson: input.contactPerson ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
    },
    select: supplierSelect,
  });
}

export async function updateSupplier(
  auth: AuthenticatedRequestContext,
  supplierId: string,
  input: SupplierUpdateInput,
) {
  const existingSupplier = await getSupplier(auth, supplierId);

  if (Object.keys(input).length === 0) {
    return existingSupplier;
  }

  try {
    return await prisma.supplier.update({
      where: {
        id_companyId: { id: supplierId, companyId: auth.companyId },
      },
      data: input,
      select: supplierSelect,
    });
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      throw new SupplierNotFoundError();
    }

    throw error;
  }
}

export async function archiveSupplier(
  auth: AuthenticatedRequestContext,
  supplierId: string,
) {
  const supplier = await getSupplier(auth, supplierId);

  if (!supplier.isActive) {
    return supplier;
  }

  try {
    return await prisma.supplier.update({
      where: {
        id_companyId: { id: supplierId, companyId: auth.companyId },
      },
      data: { isActive: false },
      select: supplierSelect,
    });
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      throw new SupplierNotFoundError();
    }

    throw error;
  }
}
