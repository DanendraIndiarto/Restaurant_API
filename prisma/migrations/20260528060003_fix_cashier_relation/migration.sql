-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `Order_cashierId_fkey`;

-- DropIndex
DROP INDEX `Order_createdAt_idx` ON `order`;

-- DropIndex
DROP INDEX `Order_paymentStatus_idx` ON `order`;

-- AlterTable
ALTER TABLE `order` MODIFY `cashierId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_cashierId_fkey` FOREIGN KEY (`cashierId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
