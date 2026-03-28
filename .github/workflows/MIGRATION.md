# Workflow Migration - Split into Stage and Production

The deployment workflows have been split into separate files for better organization and clarity.

## Changes Made

### Old Structure
```
.github/workflows/
└── deploy.yml          # Combined workflow for both environments
```

### New Structure
```
.github/workflows/
├── deploy-stage.yml    # Stage-specific workflow
├── deploy-prod.yml     # Production-specific workflow
├── README.md
├── SETUP.md
└── MIGRATION.md        # This file
```

## File Breakdown

### `deploy-stage.yml`
**Triggers:**
- Pull requests to `main` (PR checks only)
- Push to `main` (build and deploy)
- Manual workflow dispatch

**Jobs:**
1. `pr-checks` - Validates code quality and Docker build
2. `deploy-stage` - Builds, pushes, and deploys to stage
3. `notify` - Sends Teams notification

**Environment:** Stage (stg.ciyex.com)

### `deploy-prod.yml`
**Triggers:**
- Push to `release/**` branches
- Manual workflow dispatch

**Jobs:**
1. `deploy-prod` - Builds, pushes, deploys, and tags release
2. `notify` - Sends Teams notification

**Environment:** Production (app.ciyex.com)

## Benefits of Split Workflows

1. **Clarity** - Each environment has its own dedicated workflow
2. **Simpler Logic** - No complex conditionals for environment detection
3. **Easier Maintenance** - Changes to one environment don't affect the other
4. **Better Visibility** - GitHub Actions UI shows separate workflows
5. **Independent Execution** - Stage and prod can run simultaneously
6. **Matches Backend** - Follows the same pattern as ciyex backend

## Migration Steps

### 1. Delete Old Workflow (Optional)
You can safely delete the old combined workflow:
```bash
rm .github/workflows/deploy.yml
```

### 2. Verify New Workflows
The new workflows are already created and ready to use:
- ✅ `deploy-stage.yml` - Ready for stage deployments
- ✅ `deploy-prod.yml` - Ready for production deployments

### 3. Test Workflows

**Test Stage:**
```bash
# Create a test branch and PR
git checkout -b test/split-workflows
git add .github/workflows/
git commit -m "Split workflows into stage and prod"
git push origin test/split-workflows
# Create PR to main → triggers PR checks

# After merge to main → triggers stage deployment
```

**Test Production:**
```bash
# Create release branch
git checkout main
git pull origin main
git checkout -b release/v1.0.0
git push origin release/v1.0.0
# → triggers production deployment
```

## No Breaking Changes

The split workflows maintain the same functionality:
- ✅ Same Azure credentials (`AZURE_CREDENTIALS_STAGE`, `AZURE_CREDENTIALS_PROD`)
- ✅ Same Teams webhook (`TEAMS_WEBHOOK_URL`)
- ✅ Same image naming and versioning
- ✅ Same deployment process
- ✅ Same Kustomize manifests

## Workflow Comparison

| Feature | Old (deploy.yml) | New (deploy-stage.yml + deploy-prod.yml) |
|---------|------------------|------------------------------------------|
| PR Checks | ✅ | ✅ (in deploy-stage.yml) |
| Stage Deploy | ✅ | ✅ (in deploy-stage.yml) |
| Prod Deploy | ✅ | ✅ (in deploy-prod.yml) |
| Teams Notifications | ✅ | ✅ (both files) |
| Manual Trigger | ❌ | ✅ (both files) |
| File Size | Large (~550 lines) | Smaller (~280 + 280 lines) |
| Complexity | High (many conditionals) | Low (simple logic) |

## Environment Variables

Both workflows use consistent environment variables:

**Stage:**
```yaml
ACR_NAME: hinikubestageacr.azurecr.io
IMAGE_NAME: ciyex-ehr-ui-stage
CLUSTER_NAME: hiniKubeStage
RESOURCE_GROUP: hiniKubeStage-rg
VERSION: v1.0.${{ github.run_number }}
```

**Production:**
```yaml
ACR_NAME: hinikubestageacr.azurecr.io
IMAGE_NAME: ciyex-ehr-ui-prod
CLUSTER_NAME: hiniKubeProd
RESOURCE_GROUP: hiniKubeProd-rg
VERSION: v1.0.${{ github.run_number }}
```

## Rollback Plan

If you need to rollback to the combined workflow:

1. The old `deploy.yml` is still in your git history
2. You can restore it with:
   ```bash
   git checkout HEAD~1 .github/workflows/deploy.yml
   git add .github/workflows/deploy.yml
   git commit -m "Restore combined workflow"
   ```
3. Delete the split workflows:
   ```bash
   git rm .github/workflows/deploy-stage.yml
   git rm .github/workflows/deploy-prod.yml
   git commit -m "Remove split workflows"
   ```

## Next Steps

1. ✅ Review the new workflow files
2. ✅ Delete old `deploy.yml` (optional)
3. ✅ Test PR checks
4. ✅ Test stage deployment
5. ✅ Test production deployment
6. ✅ Update any documentation references

## Questions?

Refer to:
- [README.md](README.md) - Detailed workflow documentation
- [SETUP.md](SETUP.md) - Setup and configuration guide
- [../../DEPLOYMENT.md](../../DEPLOYMENT.md) - Quick deployment reference
