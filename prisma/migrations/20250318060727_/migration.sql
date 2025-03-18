-- CreateTable
CREATE TABLE `Resume` (
    `id` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `portfolioUrl` VARCHAR(191) NULL,
    `linkedinUrl` VARCHAR(191) NULL,
    `objective` TEXT NOT NULL,
    `yearsExperience` VARCHAR(191) NULL,
    `desiredRoles` TEXT NULL,
    `educationJson` JSON NULL,
    `skillsJson` JSON NULL,
    `experienceJson` JSON NULL,
    `projectsJson` JSON NULL,
    `extraCurricularJson` JSON NULL,
    `leadershipJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CoverLetter` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `jobTitle` VARCHAR(191) NULL,
    `companyName` VARCHAR(191) NULL,
    `resumeId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CoverLetter` ADD CONSTRAINT `CoverLetter_resumeId_fkey` FOREIGN KEY (`resumeId`) REFERENCES `Resume`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
