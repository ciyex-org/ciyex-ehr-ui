# ArgoCD Deployment

## Setup

Apply ArgoCD applications to your cluster:

```bash
kubectl apply -f argocd/dev.yaml
kubectl apply -f argocd/stage.yaml
kubectl apply -f argocd/prod.yaml
```

## Auto-Sync

All applications are configured with automated sync:
- **prune**: true - removes resources deleted from git
- **selfHeal**: true - reverts manual changes

## Deployment Flow

1. **Dev**: Auto-deploys when `k8s/overlays/dev/kustomization.yaml` is updated with new alpha tag
2. **Stage**: Auto-deploys when `k8s/overlays/stage/kustomization.yaml` is updated with new RC tag
3. **Prod**: Auto-deploys when `k8s/overlays/prod/kustomization.yaml` is updated with new GA tag

## Check Status

```bash
kubectl get applications -n argocd
argocd app get ciyex-ehr-ui-dev
argocd app get ciyex-ehr-ui-stage
argocd app get ciyex-ehr-ui-prod
```
