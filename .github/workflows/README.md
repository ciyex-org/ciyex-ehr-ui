# GitHub Actions CI/CD Pipeline

This directory contains GitHub Actions workflows for automated testing, building, and deployment of the Ciyex EHR UI application.

## Workflows

### `deploy-stage.yml` - Stage Deployment Pipeline

Automated CI/CD pipeline for staging environment:
- **PR Checks**: Runs linting, type checking, and Docker build validation on pull requests to `main`
- **Build & Deploy**: Builds Docker image, pushes to ACR, and deploys to stage on push to `main`
- **Teams Notification**: Sends deployment status to Microsoft Teams

### `deploy-prod.yml` - Production Deployment Pipeline

Automated CI/CD pipeline for production environment:
- **Build & Deploy**: Builds Docker image, pushes to ACR, and deploys to production on push to `release/**`
- **Release Tagging**: Creates git tags for production deployments
- **Teams Notification**: Sends deployment status to Microsoft Teams

## Workflow Triggers

### `deploy-stage.yml`
**Pull Requests to `main`:**
- Runs PR checks: linting, type checking, tests, and Docker build validation

**Push to `main`:**
- Builds Docker image: `hinikubestageacr.azurecr.io/ciyex-ehr-ui-stage:v1.0.<run_number>`
- Deploys to **Stage** environment (stg.ciyex.com)
- Sends Teams notification

### `deploy-prod.yml`
**Push to `release/**`:**
- Builds Docker image: `hinikubestageacr.azurecr.io/ciyex-ehr-ui-prod:v1.0.<run_number>`
- Deploys to **Production** environment (app.ciyex.com)
- Creates deployment tag: `prod-<version>-<timestamp>`
- Sends Teams notification

## Required Secrets

Configure these secrets in your GitHub repository settings:

### Azure Credentials

**For Stage Environment:**
- `AZURE_CREDENTIALS_STAGE` - Azure service principal credentials in JSON format:
  ```json
  {
    "clientId": "<client-id>",
    "clientSecret": "<client-secret>",
    "subscriptionId": "<subscription-id>",
    "tenantId": "<tenant-id>"
  }
  ```

**For Production Environment:**
- `AZURE_CREDENTIALS_PROD` - Azure service principal credentials in JSON format (same format as stage)

### Teams Notifications (Optional)
- `TEAMS_WEBHOOK_URL` - Microsoft Teams webhook URL for deployment notifications
  - Supports both traditional Incoming Webhook and Power Automate/Logic Apps webhooks
  - If not configured, notifications will be skipped gracefully

### Environment Configuration (Hardcoded in Workflow)
- **ACR Name**: `hinikubestageacr.azurecr.io`
- **Stage Cluster**: `hiniKubeStage` in resource group `hiniKubeStage-rg`
- **Prod Cluster**: `hiniKubeProd` in resource group `hiniKubeProd-rg`

### How to Create Azure Service Principal

```bash
# Create service principal
az ad sp create-for-rbac \
  --name "github-actions-ciyex-ehr-ui" \
  --role contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/<resource-group> \
  --sdk-auth

# Grant AKS access
az aks get-credentials \
  --resource-group <resource-group> \
  --name <cluster-name>

# Get cluster admin credentials for the service principal
az role assignment create \
  --assignee <client-id> \
  --role "Azure Kubernetes Service Cluster User Role" \
  --scope /subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.ContainerService/managedClusters/<cluster-name>
```

## Environments

GitHub Environments should be configured with protection rules:

### Stage Environment
- **Name**: `stage`
- **URL**: https://stg.ciyex.com
- **Protection**: None (auto-deploy)
- **Reviewers**: Optional

### Production Environment
- **Name**: `production`
- **URL**: https://app.ciyex.com
- **Protection**: Required reviewers recommended
- **Reviewers**: Add team leads/maintainers

## Branch Strategy

### Main Branch
- Development branch
- Automatically deploys to **Stage** on every push
- Requires PR approval before merge

### Release Branches
- Format: `release/v1.0.0`, `release/v1.1.0`, etc.
- Automatically deploys to **Production** on every push
- Created from `main` when ready for production release

### Example Workflow

```bash
# Development work
git checkout main
git pull origin main
git checkout -b feature/new-feature
# ... make changes ...
git commit -m "Add new feature"
git push origin feature/new-feature
# Create PR to main -> triggers PR checks

# After PR approval and merge to main
# -> Automatically builds and deploys to Stage

# When ready for production
git checkout main
git pull origin main
git checkout -b release/v1.0.0
git push origin release/v1.0.0
# -> Automatically builds and deploys to Production
```

## Jobs Overview

### 1. PR Checks (`pr-checks`)
**Triggers**: Pull requests only  
**Purpose**: Validate code quality before merge

**Steps**:
- Checkout code
- Setup Node.js 20 with pnpm cache
- Install dependencies
- Run ESLint
- Run TypeScript type checking
- Run tests (if configured)

### 2. Deploy to Stage (`deploy-stage`)
**Triggers**: Push to `main` only  
**Environment**: `stage`  
**Purpose**: Build, push, and deploy to staging environment

**Steps**:
- Checkout code
- Login to Azure with stage credentials
- Login to Azure Container Registry
- Build and push Docker image to ACR
- Set AKS context for stage cluster
- Update Kustomize manifest with image tag
- Apply Kubernetes manifests
- Verify deployment rollout
- Report deployment status

**Image Tags**:
- Stage: `hinikubestageacr.azurecr.io/ciyex-ehr-ui-stage:v1.0.<run_number>`
- Production: `hinikubestageacr.azurecr.io/ciyex-ehr-ui-prod:v1.0.<run_number>`

### 3. Deploy to Production (`deploy-prod`)
**Triggers**: Push to `release/**` only  
**Environment**: `production`  
**Purpose**: Deploy to production environment

**Steps**:
- Checkout code
- Login to Azure with production credentials
- Login to Azure Container Registry
- Extract release version from branch name
- Build and push Docker image to ACR
- Set AKS context for production cluster
- Update Kustomize manifest with image tag
- Apply Kubernetes manifests
- Verify deployment rollout
- Create deployment tag
- Report deployment status

### 4. Notify Team - Stage (`notify-stage`)
**Triggers**: After stage deployment (always runs)  
**Purpose**: Send Teams notification about stage deployment

**Notification includes**:
- Deployment status (success/failure)
- Version and image details
- Cluster information
- Deployed by user
- Links to workflow and application

### 5. Notify Team - Production (`notify-prod`)
**Triggers**: After production deployment (always runs)  
**Purpose**: Send Teams notification about production deployment

**Notification includes**:
- Deployment status (success/failure)
- Release version and build version
- Image and cluster details
- Deployed by user
- Links to workflow and application

## Monitoring Deployments

### View Workflow Runs
```
GitHub Repository → Actions tab
```

### Check Deployment Status
```bash
# Stage
kubectl get deployment ciyex-ehr-ui-stage
kubectl get pods -l app=ciyex-ehr-ui
kubectl logs -l app=ciyex-ehr-ui --tail=100

# Production
kubectl get deployment ciyex-ehr-ui-prod
kubectl get pods -l app=ciyex-ehr-ui
kubectl logs -l app=ciyex-ehr-ui --tail=100
```

### Rollback if Needed
```bash
# Stage
kubectl rollout undo deployment/ciyex-ehr-ui-stage

# Production
kubectl rollout undo deployment/ciyex-ehr-ui-prod
```

## Troubleshooting

### Build Failures
- Check Node.js version compatibility
- Verify pnpm-lock.yaml is committed
- Review build logs in Actions tab

### Deployment Failures
- Verify Azure credentials are correct
- Check AKS cluster connectivity
- Verify Kubernetes manifests are valid
- Check resource quotas in namespace

### Image Pull Errors
- Ensure GitHub Container Registry permissions
- Verify image tags are correct
- Check imagePullSecrets if using private registry

## Local Testing

### Test Docker Build
```bash
docker build -t ciyex-ehr-ui:test .
docker run -p 3000:3000 ciyex-ehr-ui:test
```

### Test Kustomize Manifests
```bash
# Stage
kubectl kustomize k8s/overlays/stage

# Production
kubectl kustomize k8s/overlays/prod
```

### Validate Workflow Syntax
```bash
# Install act (GitHub Actions local runner)
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run workflow locally
act push -j pr-checks
```

## Best Practices

1. **Always create PRs** - Never push directly to `main` or `release/**`
2. **Test in Stage first** - Verify changes in stage before creating release branch
3. **Use semantic versioning** - Release branches should follow `release/vX.Y.Z` format
4. **Monitor deployments** - Check deployment status after each release
5. **Keep secrets secure** - Never commit secrets to repository
6. **Review logs** - Check application logs after deployment

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Kustomize Documentation](https://kustomize.io/)
- [Azure AKS Documentation](https://docs.microsoft.com/en-us/azure/aks/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
