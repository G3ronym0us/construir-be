# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NestJS backend application using TypeScript. The project follows the standard NestJS modular architecture with controllers, services, and modules.

## Architecture

- **Framework**: NestJS v11 with Express
- **Language**: TypeScript (target ES2023)
- **Package Manager**: Yarn
- **Testing**: Jest for unit tests, Supertest for e2e tests
- **Code Quality**: ESLint with TypeScript support, Prettier for formatting

### Application Structure

- Entry point: `src/main.ts` - bootstraps NestJS application on port 3000 (or PORT env var)
- Root module: `src/app.module.ts` - imports all feature modules, controllers, and providers
- Follow NestJS conventions: modules import and organize controllers and providers
- Controllers handle HTTP requests, services contain business logic

## Development Commands

### Installation
```bash
yarn install
```

### Running the Application
```bash
yarn start           # Standard mode
yarn start:dev       # Watch mode (auto-reload on changes)
yarn start:debug     # Debug mode with watch
yarn start:prod      # Production mode (requires build)
```

### Building
```bash
yarn build           # Compiles to dist/ directory
```

### Testing
```bash
yarn test            # Run all unit tests
yarn test:watch      # Run tests in watch mode
yarn test:cov        # Run tests with coverage report
yarn test:debug      # Run tests in debug mode
yarn test:e2e        # Run end-to-end tests
```

### Code Quality
```bash
yarn lint            # Run ESLint with auto-fix
yarn format          # Format code with Prettier
```

## Code Standards

- TypeScript with strict null checks enabled
- Use decorators for NestJS components (@Controller, @Injectable, @Module, etc.)
- ESLint configured with TypeScript-specific rules
- Prettier formatting enforced
- Test files use `.spec.ts` suffix for unit tests, `.e2e-spec.ts` for e2e tests
- Jest configuration in package.json with rootDir set to `src/` for unit tests

## Static Files - Product Images

### Current Setup (Provisional)

The project serves product images locally from the `public/uploads/` directory.

**Image URLs:**
- Old WordPress URL: `http://54.236.97.190/wp-content/uploads/YYYY/MM/image.jpg`
- New local URL: `http://localhost:3000/uploads/YYYY/MM/image.jpg` (absolute URL)
- The script uses the `API_URL` environment variable or defaults to `http://localhost:3000`

**Configuration:**
- Images are served statically via `app.useStaticAssets()` in `src/main.ts`
- The `public/` directory is excluded from git (see `.gitignore`)
- Images extracted from WordPress backup: `backup_2025-07-24-2015_Construir_ef759b415768-uploads*.zip`

**Directory Structure:**
```
public/
└── uploads/
    ├── 2021/
    ├── 2022/
    ├── 2023/
    ├── 2024/
    └── 2025/
```

### Migration Script

To update image URLs in the database from WordPress to local:

```bash
yarn update-image-urls
```

This will:
- Replace `http://54.236.97.190/wp-content/uploads/` with `http://localhost:3000/uploads/`
- Update all ProductImage records
- Show statistics of updated records
- You can customize the API URL with: `API_URL=http://your-domain.com yarn update-image-urls`

### Future Migration to AWS S3

When ready to migrate to S3:

1. Upload all images from `public/uploads/` to S3
2. Update all `ProductImage` records in the database to point to S3 URLs
3. Remove the static file serving configuration
4. Use the existing S3Service for new image uploads

**Note:** Do not commit the `public/` folder to the repository as it contains ~860MB of images.

## Git Workflow

- Remote: supreme (as configured in user settings)
- Push all changes to the supreme remote
