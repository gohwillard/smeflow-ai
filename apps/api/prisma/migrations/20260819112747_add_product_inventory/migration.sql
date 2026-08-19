-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('OPENING_BALANCE', 'MANUAL_IN', 'MANUAL_OUT');

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "categories_name_trimmed_nonempty_check" CHECK (
        "name" <> '' AND
        "name" = regexp_replace("name", '^[[:space:]]+|[[:space:]]+$', '', 'g')
    )
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "categoryId" UUID,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "costPrice" DECIMAL(12,2) NOT NULL,
    "sellingPrice" DECIMAL(12,2) NOT NULL,
    "quantityOnHand" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "reorderLevel" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "products_sku_normalized_check" CHECK (
        "sku" <> '' AND
        "sku" = regexp_replace("sku", '^[[:space:]]+|[[:space:]]+$', '', 'g') AND
        "sku" = upper("sku")
    ),
    CONSTRAINT "products_name_trimmed_nonempty_check" CHECK (
        "name" <> '' AND
        "name" = regexp_replace("name", '^[[:space:]]+|[[:space:]]+$', '', 'g')
    ),
    CONSTRAINT "products_unit_trimmed_nonempty_check" CHECK (
        "unit" <> '' AND
        "unit" = regexp_replace("unit", '^[[:space:]]+|[[:space:]]+$', '', 'g')
    ),
    CONSTRAINT "products_cost_price_nonnegative_check" CHECK ("costPrice" >= 0),
    CONSTRAINT "products_selling_price_nonnegative_check" CHECK ("sellingPrice" >= 0),
    CONSTRAINT "products_quantity_on_hand_nonnegative_check" CHECK ("quantityOnHand" >= 0),
    CONSTRAINT "products_reorder_level_nonnegative_check" CHECK ("reorderLevel" >= 0)
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "quantityBefore" DECIMAL(14,3) NOT NULL,
    "quantityAfter" DECIMAL(14,3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inventory_movements_quantity_positive_check" CHECK ("quantity" > 0),
    CONSTRAINT "inventory_movements_balances_nonnegative_check" CHECK (
        "quantityBefore" >= 0 AND "quantityAfter" >= 0
    ),
    CONSTRAINT "inventory_movements_arithmetic_check" CHECK (
        (
            "type" = 'OPENING_BALANCE' AND
            "quantityBefore" = 0 AND
            "quantityAfter" = "quantity"
        ) OR
        (
            "type" = 'MANUAL_IN' AND
            "quantityAfter" = "quantityBefore" + "quantity"
        ) OR
        (
            "type" = 'MANUAL_OUT' AND
            "quantityAfter" = "quantityBefore" - "quantity"
        )
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_companyId_lower_name_key" ON "categories"("companyId", lower("name"));

-- CreateIndex
CREATE INDEX "categories_companyId_isActive_idx" ON "categories"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "categories_id_companyId_key" ON "categories"("id", "companyId");

-- CreateIndex
CREATE INDEX "products_companyId_categoryId_idx" ON "products"("companyId", "categoryId");

-- CreateIndex
CREATE INDEX "products_companyId_isActive_idx" ON "products"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "products_id_companyId_key" ON "products"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "products_companyId_sku_key" ON "products"("companyId", "sku");

-- CreateIndex
CREATE INDEX "inventory_movements_companyId_productId_createdAt_idx" ON "inventory_movements"("companyId", "productId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_id_companyId_key" ON "users"("id", "companyId");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_companyId_fkey" FOREIGN KEY ("categoryId", "companyId") REFERENCES "categories"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_productId_companyId_fkey" FOREIGN KEY ("productId", "companyId") REFERENCES "products"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_createdByUserId_companyId_fkey" FOREIGN KEY ("createdByUserId", "companyId") REFERENCES "users"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
