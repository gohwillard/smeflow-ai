import { prisma } from "../../config/database.js";
import {
  InventoryMovementType,
  Prisma,
} from "../../generated/prisma/client.js";
import type { AuthenticatedRequestContext } from "../../shared/http/auth-context.js";

import type { InventoryAdjustmentInput } from "./inventory.schema.js";

const movementSelect = {
  id: true,
  type: true,
  quantity: true,
  quantityBefore: true,
  quantityAfter: true,
  note: true,
  createdAt: true,
  createdByUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.InventoryMovementSelect;

type SelectedMovement = Prisma.InventoryMovementGetPayload<{
  select: typeof movementSelect;
}>;

export class InventoryProductNotFoundError extends Error {
  constructor() {
    super("Product was not found");
    this.name = "InventoryProductNotFoundError";
  }
}

export class ProductInactiveError extends Error {
  constructor() {
    super("Archived Products cannot receive inventory adjustments");
    this.name = "ProductInactiveError";
  }
}

export class OpeningBalanceNotAllowedError extends Error {
  constructor() {
    super("Opening balance is not allowed for this Product");
    this.name = "OpeningBalanceNotAllowedError";
  }
}

export class InsufficientStockError extends Error {
  constructor() {
    super("Insufficient stock for this adjustment");
    this.name = "InsufficientStockError";
  }
}

function serializeMovement(movement: SelectedMovement) {
  const { createdByUser, ...safeMovement } = movement;

  return {
    ...safeMovement,
    quantity: movement.quantity.toFixed(3),
    quantityBefore: movement.quantityBefore.toFixed(3),
    quantityAfter: movement.quantityAfter.toFixed(3),
    createdBy: createdByUser,
  };
}

async function diagnoseConditionalUpdateFailure(
  transaction: Prisma.TransactionClient,
  auth: AuthenticatedRequestContext,
  productId: string,
  type: InventoryMovementType,
): Promise<never> {
  const product = await transaction.product.findFirst({
    where: { id: productId, companyId: auth.companyId },
    select: { isActive: true },
  });

  if (!product) {
    throw new InventoryProductNotFoundError();
  }

  if (!product.isActive) {
    throw new ProductInactiveError();
  }

  if (type === InventoryMovementType.MANUAL_OUT) {
    throw new InsufficientStockError();
  }

  throw new OpeningBalanceNotAllowedError();
}

export async function listInventoryMovements(
  auth: AuthenticatedRequestContext,
  productId: string,
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId: auth.companyId },
    select: { id: true },
  });

  if (!product) {
    throw new InventoryProductNotFoundError();
  }

  const movements = await prisma.inventoryMovement.findMany({
    where: { companyId: auth.companyId, productId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: movementSelect,
  });

  return movements.map(serializeMovement);
}

export async function adjustInventory(
  auth: AuthenticatedRequestContext,
  productId: string,
  input: InventoryAdjustmentInput,
) {
  const type = input.type as InventoryMovementType;

  return prisma.$transaction(async (transaction) => {
    const where: Prisma.ProductWhereInput = {
      id: productId,
      companyId: auth.companyId,
      isActive: true,
    };

    if (type === InventoryMovementType.OPENING_BALANCE) {
      where.quantityOnHand = { equals: "0" };
    } else if (type === InventoryMovementType.MANUAL_OUT) {
      where.quantityOnHand = { gte: input.quantity };
    }

    const updated = await transaction.product.updateMany({
      where,
      data: {
        quantityOnHand:
          type === InventoryMovementType.MANUAL_OUT
            ? { decrement: input.quantity }
            : { increment: input.quantity },
      },
    });

    if (updated.count !== 1) {
      return diagnoseConditionalUpdateFailure(
        transaction,
        auth,
        productId,
        type,
      );
    }

    if (type === InventoryMovementType.OPENING_BALANCE) {
      const existingMovement = await transaction.inventoryMovement.findFirst({
        where: { companyId: auth.companyId, productId },
        select: { id: true },
      });

      if (existingMovement) {
        throw new OpeningBalanceNotAllowedError();
      }
    }

    const product = await transaction.product.findUnique({
      where: {
        id_companyId: { id: productId, companyId: auth.companyId },
      },
      select: { id: true, quantityOnHand: true },
    });

    if (!product) {
      throw new InventoryProductNotFoundError();
    }

    const quantityBefore =
      type === InventoryMovementType.MANUAL_OUT
        ? product.quantityOnHand.add(input.quantity)
        : product.quantityOnHand.sub(input.quantity);

    const movement = await transaction.inventoryMovement.create({
      data: {
        companyId: auth.companyId,
        productId,
        createdByUserId: auth.userId,
        type,
        quantity: input.quantity,
        quantityBefore,
        quantityAfter: product.quantityOnHand,
        note: input.note ?? null,
      },
      select: movementSelect,
    });

    return {
      product: {
        id: product.id,
        quantityOnHand: product.quantityOnHand.toFixed(3),
      },
      movement: serializeMovement(movement),
    };
  });
}
