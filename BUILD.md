# Build EHR UI with Jenkins

## Quick Start

1. **Go to Jenkins** (your Jenkins URL)
2. **Find job**: `ciyex-ehr-ui` (if it doesn't exist, create it - see JENKINS_SETUP.md)
3. **Click "Build Now"**
4. **Wait 5-10 minutes**
5. **Test**: https://app-stage.ciyex.org

## What Jenkins Does
- Builds Docker image from Dockerfile
- Pushes to: `registry.apps-prod.us-east.in.hinisoft.com/ciyex-ehr-ui`
- Updates k8s/overlays/stage/kustomization.yaml
- ArgoCD auto-deploys to cluster

## Files Ready
✅ Jenkinsfile (with admin credentials)
✅ Dockerfile (Next.js standalone)
✅ K8s manifests
✅ Registry secret in cluster

Just run the Jenkins job!
