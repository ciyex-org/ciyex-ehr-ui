# Jenkins Setup for EHR UI

## Status
✅ Jenkinsfile created in repo
❌ Jenkins job NOT configured yet

## Setup Steps

### 1. Access Jenkins
Go to your Jenkins URL (same one used for ciyex backend)

### 2. Create New Job
- Click "New Item"
- Name: `ciyex-ehr-ui`
- Type: "Pipeline"
- Click OK

### 3. Configure Job
**General:**
- Description: "Ciyex EHR UI - Next.js Frontend"

**Build Triggers:**
- ✅ GitHub hook trigger for GITScm polling

**Pipeline:**
- Definition: "Pipeline script from SCM"
- SCM: Git
- Repository URL: `git@github.com:qiaben/ciyex-ehr-ui.git`
- Credentials: (select your GitHub SSH key)
- Branch: `*/main`
- Script Path: `Jenkinsfile`

### 4. Add Registry Credentials
- Go to: Manage Jenkins → Credentials → System → Global credentials
- Click "Add Credentials"
- Kind: "Username with password"
- ID: `REGISTRY_CREDENTIALS`
- Username: `dev`
- Password: `${REGISTRY_DEV_PASSWORD}`
- Description: "Private Docker Registry"

### 5. Run Build
- Go to job page
- Click "Build Now"
- Wait ~5 minutes for build to complete

## After Build Succeeds
- Image will be at: `registry.apps-prod.us-east.in.hinisoft.com/ciyex-ehr-ui:v1.0.X`
- ArgoCD will auto-deploy to stage cluster
- Test: https://app-stage.ciyex.org
