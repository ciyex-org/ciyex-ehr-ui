# Deployment Guide

Quick reference for deploying Ciyex EHR UI to Kubernetes using GitHub Actions and Kustomize.

## Quick Start

### Automated Deployment (Recommended)

1. **Deploy to Stage**: Push or merge to `main` branch
   ```bash
   git checkout main
   git pull origin main
   # Make changes...
   git push origin main
   ```
   → Automatically deploys to https://stg.ciyex.com

2. **Deploy to Production**: Create and push a release branch
   ```bash
   git checkout main
   git pull origin main
   git checkout -b release/v1.0.0
   git push origin release/v1.0.0
   ```
   → Automatically deploys to https://app.ciyex.com

### Manual Deployment

If you need to deploy manually:

```bash
# Stage
kubectl apply -k k8s/overlays/stage

# Production
kubectl apply -k k8s/overlays/prod
```

## GitHub Actions Setup

### Required Secrets

Add these in **Settings → Secrets and variables → Actions**:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `AZURE_CREDENTIALS_STAGE` | Azure service principal JSON for stage | `{"clientId":"...","clientSecret":"..."}` |
| `AZURE_CREDENTIALS_PROD` | Azure service principal JSON for prod | `{"clientId":"...","clientSecret":"..."}` |
| `TEAMS_WEBHOOK_URL` | Microsoft Teams webhook (optional) | `https://...webhook.office.com/...` |

### Environment Configuration (Hardcoded)

| Environment | ACR | Cluster | Resource Group |
|------------|-----|---------|----------------|
| Stage | `hinikubestageacr.azurecr.io` | `hiniKubeStage` | `hiniKubeStage-rg` |
| Production | `hinikubestageacr.azurecr.io` | `hiniKubeProd` | `hiniKubeProd-rg` |

### Environment Protection (Optional)

Configure in **Settings → Environments**:

**Production Environment**:
- Add required reviewers
- Add deployment branch rule: `release/**`
- Set environment URL: `https://app.ciyex.com`

## Deployment Workflow

```
┌─────────────────┐
│  Feature Branch │
└────────┬────────┘
         │ Create PR
         ↓
┌─────────────────┐
│   PR Checks     │ ← Lint, Type Check, Tests (deploy-stage.yml)
└────────┬────────┘
         │ Merge
         ↓
┌─────────────────┐
│   Main Branch   │
└────────┬────────┘
         │ Auto Deploy (deploy-stage.yml)
         ↓
┌─────────────────┐
│  Stage (stg)    │ ← https://stg.ciyex.com
└────────┬────────┘
         │ Create release branch
         ↓
┌─────────────────┐
│ Release Branch  │
└────────┬────────┘
         │ Auto Deploy (deploy-prod.yml)
         ↓
┌─────────────────┐
│  Prod (app)     │ ← https://app.ciyex.com
└─────────────────┘
```

## Monitoring

### Check Deployment Status

```bash
# Stage
kubectl get deployment ciyex-ehr-ui-stage
kubectl get pods -l app=ciyex-ehr-ui

# Production
kubectl get deployment ciyex-ehr-ui-prod
kubectl get pods -l app=ciyex-ehr-ui
```

### View Logs

```bash
# Stage
kubectl logs -l app=ciyex-ehr-ui -n default --tail=100 -f

# Production
kubectl logs -l app=ciyex-ehr-ui -n default --tail=100 -f
```

### Check Ingress

```bash
# Stage
kubectl get ingress ciyex-ehr-ui-ingress-stage
kubectl describe ingress ciyex-ehr-ui-ingress-stage

# Production
kubectl get ingress ciyex-ehr-ui-ingress-prod
kubectl describe ingress ciyex-ehr-ui-ingress-prod
```

## Rollback

### Via kubectl

```bash
# Stage
kubectl rollout undo deployment/ciyex-ehr-ui-stage

# Production
kubectl rollout undo deployment/ciyex-ehr-ui-prod
```

### Via GitHub Actions

Re-run a previous successful workflow from the Actions tab.

## Troubleshooting

### Deployment Stuck

```bash
# Check pod status
kubectl get pods -l app=ciyex-ehr-ui

# Describe pod for events
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name>
```

### Image Pull Errors

```bash
# Verify image exists
docker pull ghcr.io/<your-org>/ciyex-ehr-ui:<tag>

# Check image pull secrets
kubectl get secrets
```

### Ingress Not Working

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check certificate
kubectl get certificate
kubectl describe certificate ciyex-ehr-ui-stage-tls
```

## File Structure

```
.
├── .github/
│   └── workflows/
│       ├── deploy-stage.yml    # Stage deployment workflow
│       ├── deploy-prod.yml     # Production deployment workflow
│       └── README.md           # Workflow documentation
├── k8s/
│   ├── base/                   # Base Kubernetes manifests
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── ingress.yaml
│   │   └── kustomization.yaml
│   ├── overlays/
│   │   ├── stage/             # Stage environment
│   │   │   ├── kustomization.yaml
│   │   │   ├── deployment-patch.yaml
│   │   │   └── ingress-patch.yaml
│   │   └── prod/              # Production environment
│   │       ├── kustomization.yaml
│   │       ├── deployment-patch.yaml
│   │       └── ingress-patch.yaml
│   └── README.md              # Kubernetes documentation
├── Dockerfile                 # Docker build configuration
├── .dockerignore             # Docker ignore patterns
└── DEPLOYMENT.md             # This file
```

## Environment Variables

### Stage
- `NODE_ENV=staging`
- `NEXT_PUBLIC_ENV=staging`
- `NEXT_PUBLIC_API_URL=https://stg.ciyex.com/api`

### Production
- `NODE_ENV=production`
- `NEXT_PUBLIC_ENV=production`
- `NEXT_PUBLIC_API_URL=https://app.ciyex.com/api`

## Resources

- **Stage**: 1 replica, no resource limits
- **Production**: 2 replicas, 512Mi-1Gi memory, 250m-500m CPU

## Support

For issues or questions:
1. Check GitHub Actions logs
2. Review Kubernetes events: `kubectl get events --sort-by='.lastTimestamp'`
3. Check application logs
4. Review this documentation

## Related Documentation

- [GitHub Actions Workflow](.github/workflows/README.md)
- [Kubernetes Deployment](k8s/README.md)
- [Main README](README.md)
