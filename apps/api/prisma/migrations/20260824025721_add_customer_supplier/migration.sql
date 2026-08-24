-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "registrationNumber" VARCHAR(100),
    "contactPerson" VARCHAR(200),
    "email" VARCHAR(320),
    "phone" VARCHAR(50),
    "billingAddress" VARCHAR(2000),
    "shippingAddress" VARCHAR(2000),
    "notes" VARCHAR(2000),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customers_name_trimmed_nonempty_check" CHECK (
        "name" <> '' AND
        "name" = regexp_replace("name", '^[[:space:]]+|[[:space:]]+$', '', 'g')
    ),
    CONSTRAINT "customers_registration_number_trimmed_nonempty_check" CHECK (
        "registrationNumber" IS NULL OR (
            "registrationNumber" <> '' AND
            "registrationNumber" = regexp_replace("registrationNumber", '^[[:space:]]+|[[:space:]]+$', '', 'g')
        )
    ),
    CONSTRAINT "customers_contact_person_trimmed_nonempty_check" CHECK (
        "contactPerson" IS NULL OR (
            "contactPerson" <> '' AND
            "contactPerson" = regexp_replace("contactPerson", '^[[:space:]]+|[[:space:]]+$', '', 'g')
        )
    ),
    CONSTRAINT "customers_email_trimmed_nonempty_check" CHECK (
        "email" IS NULL OR (
            "email" <> '' AND
            "email" = regexp_replace("email", '^[[:space:]]+|[[:space:]]+$', '', 'g')
        )
    ),
    CONSTRAINT "customers_phone_trimmed_nonempty_check" CHECK (
        "phone" IS NULL OR (
            "phone" <> '' AND
            "phone" = regexp_replace("phone", '^[[:space:]]+|[[:space:]]+$', '', 'g')
        )
    ),
    CONSTRAINT "customers_billing_address_trimmed_nonempty_check" CHECK (
        "billingAddress" IS NULL OR (
            "billingAddress" <> '' AND
            "billingAddress" = regexp_replace("billingAddress", '^[[:space:]]+|[[:space:]]+$', '', 'g')
        )
    ),
    CONSTRAINT "customers_shipping_address_trimmed_nonempty_check" CHECK (
        "shippingAddress" IS NULL OR (
            "shippingAddress" <> '' AND
            "shippingAddress" = regexp_replace("shippingAddress", '^[[:space:]]+|[[:space:]]+$', '', 'g')
        )
    ),
    CONSTRAINT "customers_notes_trimmed_nonempty_check" CHECK (
        "notes" IS NULL OR (
            "notes" <> '' AND
            "notes" = regexp_replace("notes", '^[[:space:]]+|[[:space:]]+$', '', 'g')
        )
    )
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "registrationNumber" VARCHAR(100),
    "contactPerson" VARCHAR(200),
    "email" VARCHAR(320),
    "phone" VARCHAR(50),
    "address" VARCHAR(2000),
    "notes" VARCHAR(2000),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "suppliers_name_trimmed_nonempty_check" CHECK (
        "name" <> '' AND
        "name" = regexp_replace("name", '^[[:space:]]+|[[:space:]]+$', '', 'g')
    ),
    CONSTRAINT "suppliers_registration_number_trimmed_nonempty_check" CHECK (
        "registrationNumber" IS NULL OR (
            "registrationNumber" <> '' AND
            "registrationNumber" = regexp_replace("registrationNumber", '^[[:space:]]+|[[:space:]]+$', '', 'g')
        )
    ),
    CONSTRAINT "suppliers_contact_person_trimmed_nonempty_check" CHECK (
        "contactPerson" IS NULL OR (
            "contactPerson" <> '' AND
            "contactPerson" = regexp_replace("contactPerson", '^[[:space:]]+|[[:space:]]+$', '', 'g')
        )
    ),
    CONSTRAINT "suppliers_email_trimmed_nonempty_check" CHECK (
        "email" IS NULL OR (
            "email" <> '' AND
            "email" = regexp_replace("email", '^[[:space:]]+|[[:space:]]+$', '', 'g')
        )
    ),
    CONSTRAINT "suppliers_phone_trimmed_nonempty_check" CHECK (
        "phone" IS NULL OR (
            "phone" <> '' AND
            "phone" = regexp_replace("phone", '^[[:space:]]+|[[:space:]]+$', '', 'g')
        )
    ),
    CONSTRAINT "suppliers_address_trimmed_nonempty_check" CHECK (
        "address" IS NULL OR (
            "address" <> '' AND
            "address" = regexp_replace("address", '^[[:space:]]+|[[:space:]]+$', '', 'g')
        )
    ),
    CONSTRAINT "suppliers_notes_trimmed_nonempty_check" CHECK (
        "notes" IS NULL OR (
            "notes" <> '' AND
            "notes" = regexp_replace("notes", '^[[:space:]]+|[[:space:]]+$', '', 'g')
        )
    )
);

-- CreateIndex
CREATE INDEX "customers_companyId_isActive_idx" ON "customers"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "customers_id_companyId_key" ON "customers"("id", "companyId");

-- CreateIndex
CREATE INDEX "suppliers_companyId_isActive_idx" ON "suppliers"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_id_companyId_key" ON "suppliers"("id", "companyId");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
