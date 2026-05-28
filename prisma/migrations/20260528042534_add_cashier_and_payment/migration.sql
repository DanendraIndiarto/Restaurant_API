/*
  Warnings:

  - You are about to drop the column `isActive` on the `menu` table. All the data in the column will be lost.
  - Added the required column `cashierId` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `orderitem` DROP FOREIGN KEY `OrderItem_orderId_fkey`;

-- AlterTable
ALTER TABLE `menu` DROP COLUMN `isActive`;

-- AlterTable
ALTER TABLE `order` ADD COLUMN `cashierId` INTEGER NOT NULL,
    ADD COLUMN `paymentMethod` ENUM('CASH', 'QRIS') NOT NULL DEFAULT 'CASH',
    ADD COLUMN `paymentStatus` ENUM('UNPAID', 'PAID') NOT NULL DEFAULT 'UNPAID';

-- CreateIndex
CREATE INDEX `Order_cashierId_idx` ON `Order`(`cashierId`);

-- CreateIndex
CREATE INDEX `Order_createdAt_idx` ON `Order`(`createdAt`);

-- CreateIndex
CREATE INDEX `Order_paymentStatus_idx` ON `Order`(`paymentStatus`);

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_cashierId_fkey` FOREIGN KEY (`cashierId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `orderitem` RENAME INDEX `OrderItem_menuId_fkey` TO `OrderItem_menuId_idx`;

-- RenameIndex
ALTER TABLE `orderitem` RENAME INDEX `OrderItem_orderId_fkey` TO `OrderItem_orderId_idx`;
