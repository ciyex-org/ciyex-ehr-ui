# GitHub Actions Setup Guide

This guide will help you configure GitHub Actions for automated deployment of the Ciyex EHR UI application.

## Overview

The workflow is configured to match the backend deployment pattern:
- Uses **Azure Container Registry** (ACR): `hinikubestageacr.azurecr.io`
- Deploys to **Azure Kubernetes Service** (AKS)
- Separate credentials for stage and production environments

## Prerequisites

1. Azure subscription with:
   - Azure Container Registry: `hinikubestageacr`
   - AKS Cluster (Stage): `hiniKubeStage` in `hiniKubeStage-rg`
   - AKS Cluster (Prod): `hiniKubeProd` in `hiniKubeProd-rg`

2. Azure service principals with permissions for:
   - ACR push/pull
   - AKS deployment

## Step 1: Create Azure Service Principals

### For Stage Environment

```bash
# Create service principal for stage
az ad sp create-for-rbac \
  --name "github-actions-ciyex-ehr-ui-stage" \
  --role contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/hiniKubeStage-rg \
  --sdk-auth

# Grant ACR push permissions
az role assignment create \
  --assignee <client-id-from-above> \
  --role AcrPush \
  --scope /subscriptions/<subscription-id>/resourceGroups/<acr-resource-group>/providers/Microsoft.ContainerRegistry/registries/hinikubestageacr

# Grant AKS access
az role assignment create \
  --assignee <client-id-from-above> \
  --role "Azure Kubernetes Service Cluster User Role" \
  --scope /subscriptions/<subscription-id>/resourceGroups/hiniKubeStage-rg/providers/Microsoft.ContainerService/managedClusters/hiniKubeStage
```

### For Production Environment

```bash
# Create service principal for production
az ad sp create-for-rbac \
  --name "github-actions-ciyex-ehr-ui-prod" \
  --role contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/hiniKubeProd-rg \
  --sdk-auth

# Grant ACR push permissions
az role assignment create \
  --assignee <client-id-from-above> \
  --role AcrPush \
  --scope /subscriptions/<subscription-id>/resourceGroups/<acr-resource-group>/providers/Microsoft.ContainerRegistry/registries/hinikubestageacr

# Grant AKS access
az role assignment create \
  --assignee <client-id-from-above> \
  --role "Azure Kubernetes Service Cluster User Role" \
  --scope /subscriptions/<subscription-id>/resourceGroups/hiniKubeProd-rg/providers/Microsoft.ContainerService/managedClusters/hiniKubeProd
```

## Step 2: Configure GitHub Secrets

Go to your GitHub repository: **Settings → Secrets and variables → Actions**

### Add Repository Secrets

1. **AZURE_CREDENTIALS_STAGE**
   - Click "New repository secret"
   - Name: `AZURE_CREDENTIALS_STAGE`
   - Value: The JSON output from the stage service principal creation (entire JSON object)
   ```json
   {
     "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
     "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
     "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
     "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   }
   ```

2. **AZURE_CREDENTIALS_PROD**
   - Click "New repository secret"
   - Name: `AZURE_CREDENTIALS_PROD`
   - Value: The JSON output from the production service principal creation

3. **TEAMS_WEBHOOK_URL** (Optional)
   - Click "New repository secret"
   - Name: `TEAMS_WEBHOOK_URL`
   - Value: Your Microsoft Teams webhook URL
   - See "Setting up Teams Webhook" section below

## Step 3: Configure GitHub Environments (Optional but Recommended)

### Stage Environment

1. Go to **Settings → Environments**
2. Click "New environment"
3. Name: `stage`
4. Configure:
   - **Deployment branches**: Selected branches → `main`
   - **Environment URL**: `https://stg.ciyex.com`
   - **Reviewers**: Optional (can leave empty for auto-deploy)

### Production Environment

1. Click "New environment"
2. Name: `production`
3. Configure:
   - **Deployment branches**: Selected branches → `release/**`
   - **Environment URL**: `https://app.ciyex.com`
   - **Reviewers**: Add required reviewers (RECOMMENDED)
   - **Wait timer**: Optional (e.g., 5 minutes)

## Step 4: Test the Workflow

### Test PR Checks

1. Create a feature branch:
   ```bash
   git checkout -b test/workflow-setup
   echo "# Test" >> README.md
   git add README.md
   git commit -m "Test workflow"
   git push origin test/workflow-setup
   ```

2. Create a Pull Request to `main`
3. Check the Actions tab - should see "PR Checks - Validate Build" running
4. Verify it runs: lint, type check, tests, and Docker build

### Test Stage Deployment

1. Merge the PR to `main` (or push directly to main)
2. Check the Actions tab - should see "Deploy to Stage" running
3. Verify it:
   - Builds Docker image
   - Pushes to ACR
   - Deploys to AKS stage cluster
   - Verifies deployment

3. Check deployment:
   ```bash
   kubectl get deployment ciyex-ehr-ui-stage
   kubectl get pods -l app=ciyex-ehr-ui
   ```

4. Visit: https://stg.ciyex.com

### Test Production Deployment

1. Create a release branch:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b release/v1.0.0
   git push origin release/v1.0.0
   ```

2. Check the Actions tab - should see "Deploy to Production" running
3. If you configured reviewers, approve the deployment
4. Verify it:
   - Builds Docker image
   - Pushes to ACR
   - Deploys to AKS prod cluster
   - Creates deployment tag

5. Check deployment:
   ```bash
   kubectl get deployment ciyex-ehr-ui-prod
   kubectl get pods -l app=ciyex-ehr-ui
   ```

6. Visit: https://app.ciyex.com

## Troubleshooting

### Authentication Errors

If you see authentication errors:

```bash
# Verify service principal has correct permissions
az role assignment list --assignee <client-id> --all

# Test ACR login manually
az acr login --name hinikubestageacr

# Test AKS access
az aks get-credentials --resource-group hiniKubeStage-rg --name hiniKubeStage
kubectl get nodes
```

### Image Push Errors

If image push fails:

```bash
# Check ACR exists and is accessible
az acr show --name hinikubestageacr

# Check ACR permissions
az acr show --name hinikubestageacr --query "id" -o tsv
az role assignment list --scope <acr-id>
```

### Deployment Errors

If deployment fails:

```bash
# Check AKS cluster status
az aks show --resource-group hiniKubeStage-rg --name hiniKubeStage

# Check if manifests are valid
kubectl kustomize k8s/overlays/stage/

# Check pod logs
kubectl logs -l app=ciyex-ehr-ui --tail=100
```

### Workflow Not Triggering

- Verify branch names match exactly (`main`, `release/**`)
- Check workflow file syntax (YAML)
- Ensure workflow file is in `.github/workflows/` directory
- Check Actions tab for any errors

## Workflow Files

The deployment uses these key files:

```
.github/workflows/
├── deploy-stage.yml       # Stage deployment workflow
├── deploy-prod.yml        # Production deployment workflow
├── README.md              # Detailed documentation
└── SETUP.md               # This file

k8s/
├── base/                  # Base Kubernetes manifests
├── overlays/
│   ├── stage/            # Stage-specific configs
│   └── prod/             # Production-specific configs
└── README.md             # Kubernetes documentation

Dockerfile                 # Docker build configuration
DEPLOYMENT.md             # Quick reference guide
```

## Image Versioning

Images are tagged with:
- **Version**: `v1.0.<github.run_number>`
- **Stage**: `hinikubestageacr.azurecr.io/ciyex-ehr-ui-stage:v1.0.123`
- **Production**: `hinikubestageacr.azurecr.io/ciyex-ehr-ui-prod:v1.0.123`

The run number automatically increments with each workflow run.

## Setting up Teams Webhook

### Option 1: Traditional Incoming Webhook

1. In Microsoft Teams, go to your channel
2. Click "..." → "Connectors" → "Incoming Webhook"
3. Click "Configure"
4. Give it a name (e.g., "Ciyex EHR UI Deployments")
5. Copy the webhook URL
6. Add to GitHub secrets as `TEAMS_WEBHOOK_URL`

### Option 2: Power Automate Webhook (Recommended)

1. Go to [Power Automate](https://make.powerautomate.com)
2. Create a new "Instant cloud flow"
3. Choose "When a HTTP request is received" trigger
4. Add action "Post adaptive card in a chat or channel"
5. Configure the card to display deployment information
6. Copy the HTTP POST URL
7. Add to GitHub secrets as `TEAMS_WEBHOOK_URL`

The workflow automatically detects which type of webhook you're using and formats the message accordingly.

## Notification Features

The Teams notifications include:
- ✅ Success/failure status with color coding
- 📦 Version and image information
- 🔗 Direct links to workflow and application
- 👤 Who deployed
- 🏷️ Commit SHA
- 🌐 Environment details

## Next Steps

1. ✅ Create Azure service principals
2. ✅ Add GitHub secrets (Azure + Teams)
3. ✅ Configure GitHub environments
4. ✅ Test PR workflow
5. ✅ Test stage deployment
6. ✅ Test production deployment
7. ✅ Verify Teams notifications
8. ✅ Set up monitoring and alerts
9. ✅ Document any custom configurations

## Support

For issues:
1. Check GitHub Actions logs
2. Review Azure portal for AKS/ACR status
3. Check Kubernetes events: `kubectl get events --sort-by='.lastTimestamp'`
4. Review workflow documentation in README.md

## Related Documentation

- [Workflow Documentation](README.md)
- [Kubernetes Deployment](../../k8s/README.md)
- [Quick Deployment Guide](../../DEPLOYMENT.md)
