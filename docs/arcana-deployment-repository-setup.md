# ArcanaAI Deployment Repository Setup

This guide creates a separate private GitOps repository for deploying ArcanaAI with Kustomize, K3s, and Argo CD. Follow the steps manually to learn the workflow; none of these commands should be run from CI.

## Intended delivery flow

```text
arcana-ai main branch
        |
        v
GitHub Actions: test and build
        |
        v
Docker Hub: SHA-tagged images
        |
        v
arcana-deployment: desired production state
        |
        v
Argo CD
        |
        v
K3s
```

GitHub Actions remains responsible for CI and publishing public images to Docker Hub. Argo CD becomes the production deployment authority. Supabase remains outside the cluster.

## 1. Create the GitHub repository

Go to <https://github.com/new> and select:

- Owner: `vanloc1808`
- Repository name: `arcana-deployment`
- Description: `GitOps deployment configuration for ArcanaAI`
- Visibility: Private
- Initialize with README: Yes
- `.gitignore`: None
- License: None

Private visibility reduces unnecessary exposure of infrastructure details. It does not make Git safe for plaintext secrets.

## 2. Clone the repository

Run on the local Mac:

```bash
cd /Users/vanloc1808/Projects
git clone git@github.com:vanloc1808/arcana-deployment.git
cd arcana-deployment
git remote -v
git status
```

The `origin` remote should be `git@github.com:vanloc1808/arcana-deployment.git`.

## 3. Create the initial structure

Run from `/Users/vanloc1808/Projects/arcana-deployment`:

```bash
mkdir -p apps/arcana/base
mkdir -p apps/arcana/overlays/production
mkdir -p bootstrap/argocd
mkdir -p docs
touch apps/arcana/base/namespace.yaml
touch apps/arcana/base/kustomization.yaml
touch apps/arcana/overlays/production/kustomization.yaml
touch bootstrap/argocd/arcana-production.yaml
touch docs/bootstrap.md
touch .gitignore
```

Expected layout:

```text
arcana-deployment/
├── README.md
├── .gitignore
├── apps/
│   └── arcana/
│       ├── base/
│       │   ├── namespace.yaml
│       │   └── kustomization.yaml
│       └── overlays/
│           └── production/
│               └── kustomization.yaml
├── bootstrap/
│   └── argocd/
│       └── arcana-production.yaml
└── docs/
    └── bootstrap.md
```

The base holds environment-independent resources. The production overlay applies production-specific configuration. The bootstrap directory contains resources applied manually once to connect Argo CD to Git.

## 4. Define the Arcana namespace

Put this in `apps/arcana/base/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: arcana
  labels:
    app.kubernetes.io/part-of: arcana
```

## 5. Define the base Kustomization

Put this in `apps/arcana/base/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - namespace.yaml

labels:
  - pairs:
      app.kubernetes.io/part-of: arcana
    includeSelectors: true
```

Later, this resource list will also contain the frontend, backend, Redis, Celery worker, Celery Beat, Services, and related configuration.

## 6. Define the production overlay

Put this in `apps/arcana/overlays/production/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

labels:
  - pairs:
      app.kubernetes.io/environment: production
```

After application Deployments exist, this overlay will hold their release image tags:

```yaml
images:
  - name: vanloc1808/tarot-backend
    newTag: COMMIT_SHA
  - name: vanloc1808/tarot-frontend
    newTag: COMMIT_SHA
```

Do not add these placeholder image declarations until there are Deployments for Kustomize to modify.

## 7. Define the Argo CD Application

Put this in `bootstrap/argocd/arcana-production.yaml`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: arcana-production
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default

  source:
    repoURL: git@github.com:vanloc1808/arcana-deployment.git
    targetRevision: main
    path: apps/arcana/overlays/production

  destination:
    server: https://kubernetes.default.svc
    namespace: arcana

  syncPolicy:
    automated:
      enabled: true
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - PruneLast=true

  revisionHistoryLimit: 10
```

This tells Argo CD to watch the production overlay on `main`, deploy it into the local cluster, prune resources removed from Git, and correct manual cluster drift.

Because the repository is private, Argo CD will eventually require read-only GitHub credentials. Configure those during the Argo CD installation; never put credentials in this manifest.

## 8. Protect local secrets

Put this in `.gitignore`:

```gitignore
.DS_Store
*.swp
*.tmp
.env
.env.*
!.env.example
secrets/
*.agekey
```

Never commit:

- Supabase service-role keys or database URLs
- JWT or application secrets
- Docker Hub or GitHub tokens
- Age private keys
- Plaintext Kubernetes Secrets

Base64 is encoding, not encryption. A later phase will introduce SOPS with Age or another encrypted-secret mechanism.

## 9. Write the deployment repository README

Replace `README.md` with:

```markdown
# ArcanaAI Deployment

GitOps configuration for deploying ArcanaAI to a single-node K3s cluster with
Argo CD.

## Responsibilities

This repository owns:

- Kubernetes manifests for ArcanaAI
- Production configuration
- Argo CD application definitions
- Deployment and recovery documentation

This repository does not own:

- ArcanaAI application source code
- Docker image builds
- PostgreSQL
- Prometheus or Grafana

## Delivery flow

1. ArcanaAI source is merged into `main`.
2. GitHub Actions tests the application.
3. GitHub Actions publishes commit-SHA-tagged images to Docker Hub.
4. CI updates the image tags in this repository.
5. Argo CD reconciles K3s with this repository.

## Repository layout

- `apps/arcana/base`: Shared Kubernetes resources
- `apps/arcana/overlays/production`: Production configuration
- `bootstrap/argocd`: Argo CD bootstrap resources
- `docs`: Operations and recovery documentation

## Security

Never commit plaintext credentials, private keys, environment files, or
unencrypted Kubernetes secrets.
```

## 10. Start the recovery document

Put this in `docs/bootstrap.md`:

```markdown
# ArcanaAI Cluster Bootstrap

This document describes how to reconstruct the ArcanaAI deployment on a fresh
VPS.

## Planned order

1. Harden the VPS.
2. Install a pinned K3s release.
3. Install a pinned Argo CD release.
4. Configure read-only access to this Git repository.
5. Apply `bootstrap/argocd/arcana-production.yaml`.
6. Verify that the application is synced and healthy.

## Not yet implemented

The cluster, Argo CD installation, application workloads, encrypted secrets,
ingress, persistence, and CI promotion workflow remain to be configured.
```

## 11. Validate the repository locally

If `kubectl` is installed, run from the deployment repository root:

```bash
kubectl kustomize apps/arcana/overlays/production
```

The rendered result should contain one `Namespace` named `arcana`.

Validate the rendered resources offline with `kubeconform`:

```bash
kubectl kustomize apps/arcana/overlays/production \
  | kubeconform -strict -summary -exit-on-error
```

Expected result:

```text
Summary: 1 resource found parsing stdin - Valid: 1, Invalid: 0, Errors: 0, Skipped: 0
```

`kubectl apply --dry-run=client` still performs Kubernetes API discovery, so it
is not an offline validation command. After K3s is available, perform
server-side validation with:

```bash
kubectl apply \
  --dry-run=server \
  -k apps/arcana/overlays/production
```

Do not run a real `kubectl apply` yet.

## 12. Commit and push

Inspect the exact contents first:

```bash
git status
git diff
```

Then create the first deployment commit:

```bash
git add .
git commit -m "chore: initialize ArcanaAI GitOps repository"
git push origin main
```

Open the repository on GitHub and confirm that the complete structure is present and no secret was committed.

## 13. Record the decision in ArcanaAI

Return to the application repository:

```bash
cd /Users/vanloc1808/Projects/arcana-ai
```

Update `tasks/plan.md` to record:

```markdown
- Deployment manifests live in the separate private
  `vanloc1808/arcana-deployment` repository.
```

Update the first task in `tasks/todo.md` to show these decisions:

```markdown
- [x] Use the separate `vanloc1808/arcana-deployment` repository.
- [x] Argo CD watches `main` at `apps/arcana/overlays/production`.
- [x] Use Kustomize with base and production overlay directories.
```

## Completion check

Run from the deployment repository and retain the output for review:

```bash
find . -maxdepth 5 -type f -not -path './.git/*' | sort
kubectl kustomize apps/arcana/overlays/production
git status
```

## 14. Add the backend Kubernetes workload

Create the files from `/Users/vanloc1808/Projects/arcana-deployment`:

```bash
touch apps/arcana/base/backend-configmap.yaml
touch apps/arcana/base/backend-deployment.yaml
touch apps/arcana/base/backend-service.yaml
```

This is the first application slice. It adds the backend Deployment and an
internal Service but does not expose the backend publicly.

### 14.1 Add non-secret backend configuration

Put this in `apps/arcana/base/backend-configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: arcana-backend-config
data:
  FASTAPI_ENV: production
  AUTH_COOKIE_DOMAIN: .nguyenvanloc.com
  AUTH_COOKIE_SECURE: "true"
  AUTH_COOKIE_SAMESITE: lax
  REDIS_URL: redis://arcana-redis:6379/0
  REDIS_HOST: arcana-redis
  REDIS_PORT: "6379"
  REDIS_DB: "0"
  CELERY_BROKER_URL: redis://arcana-redis:6379/0
  CELERY_RESULT_BACKEND: redis://arcana-redis:6379/1
  CELERY_TIMEZONE: UTC
  CELERY_ENABLE_UTC: "true"
  PROMETHEUS_MULTIPROC_DIR: /tmp/prometheus-multiproc
```

A ConfigMap is only for non-sensitive configuration. Supabase and other
credentials will come from an encrypted `arcana-backend-secrets` Secret in a
later phase.

### 14.2 Add the backend Deployment

Put this in `apps/arcana/base/backend-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: arcana-backend
spec:
  replicas: 1

  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1

  selector:
    matchLabels:
      app.kubernetes.io/name: arcana-backend

  template:
    metadata:
      labels:
        app.kubernetes.io/name: arcana-backend
        app.kubernetes.io/component: backend
    spec:
      containers:
        - name: backend
          image: vanloc1808/tarot-backend:latest
          imagePullPolicy: IfNotPresent

          ports:
            - name: http
              containerPort: 8000
              protocol: TCP

          envFrom:
            - configMapRef:
                name: arcana-backend-config
            - secretRef:
                name: arcana-backend-secrets

          startupProbe:
            httpGet:
              path: /api/health/
              port: http
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 30

          readinessProbe:
            httpGet:
              path: /api/health/
              port: http
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 3

          livenessProbe:
            httpGet:
              path: /api/health/
              port: http
            periodSeconds: 20
            timeoutSeconds: 2
            failureThreshold: 3

          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi

          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
            seccompProfile:
              type: RuntimeDefault

      terminationGracePeriodSeconds: 30
```

The startup probe allows up to 150 seconds for the current container startup.
Readiness controls whether the Service sends traffic to the Pod, while
liveness restarts a backend that becomes unresponsive. The resource values are
initial estimates and must be tuned from production measurements.

Keep one replica for now. The current backend image runs Alembic migrations in
its startup script; a later phase must move migrations into a dedicated Argo CD
hook Job before the backend is scaled horizontally.

### 14.3 Add the internal backend Service

Put this in `apps/arcana/base/backend-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: arcana-backend
spec:
  type: ClusterIP

  selector:
    app.kubernetes.io/name: arcana-backend

  ports:
    - name: http
      port: 8000
      targetPort: http
      protocol: TCP
```

The backend will be available inside Kubernetes at
`http://arcana-backend:8000`. Traefik Ingress will expose it publicly later.

### 14.4 Register the backend resources

Update `apps/arcana/base/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - namespace.yaml
  - backend-configmap.yaml
  - backend-deployment.yaml
  - backend-service.yaml

labels:
  - pairs:
      app.kubernetes.io/part-of: arcana
    includeSelectors: true
```

### 14.5 Pin the production backend image

Obtain an ArcanaAI commit for which the Docker Hub build succeeded:

```bash
git -C /Users/vanloc1808/Projects/arcana-ai rev-parse HEAD
```

Update `apps/arcana/overlays/production/kustomization.yaml`, replacing the
placeholder with that real 40-character SHA:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

labels:
  - pairs:
      app.kubernetes.io/environment: production

images:
  - name: vanloc1808/tarot-backend
    newTag: REPLACE_WITH_THE_REAL_COMMIT_SHA
```

Confirm that the exact SHA-tagged image exists on Docker Hub. Production must
not depend on the mutable `latest` tag.

### 14.6 Render and validate the backend slice

```bash
kubectl kustomize apps/arcana/overlays/production \
  | kubeconform -strict -summary -exit-on-error
```

Expected summary:

```text
Summary: 4 resources found parsing stdin - Valid: 4, Invalid: 0, Errors: 0, Skipped: 0
```

Confirm that Kustomize replaced `latest`:

```bash
kubectl kustomize apps/arcana/overlays/production \
  | rg 'image:'
```

Expected result:

```text
image: vanloc1808/tarot-backend:<commit-sha>
```

Finish the local checks:

```bash
kubectl kustomize apps/arcana/overlays/production
git diff --check
git status
```

Do not deploy yet. The referenced `arcana-backend-secrets` Secret does not
exist, so the manifest validates but the Pod intentionally cannot start.

### 14.7 Commit the backend slice

```bash
git add apps/arcana
git commit -m "feat: add ArcanaAI backend Kubernetes workload"
git push origin main
```

## 15. Set up SOPS with Age for encrypted secrets

This phase creates the encryption policy and an encrypted backend Secret. It
does not yet teach Argo CD how to decrypt the file. That integration requires
KSOPS or another Argo CD config-management plugin and will be added after the
cluster exists.

### 15.1 Install the local tools

Run on the Mac:

```bash
brew install age sops
age --version
sops --version
```

Both tools are free and open source. Age owns the encryption identity; SOPS
encrypts only the sensitive values while leaving Kubernetes metadata readable.

### 15.2 Create the Age identity safely

The private identity must live outside every Git repository. First confirm that
the proposed path does not already exist:

```bash
test ! -e /Users/vanloc1808/.config/sops/age/keys.txt
```

Only if that command succeeds, create the directory and identity:

```bash
mkdir -p /Users/vanloc1808/.config/sops/age
age-keygen -o /Users/vanloc1808/.config/sops/age/keys.txt
chmod 600 /Users/vanloc1808/.config/sops/age/keys.txt
```

Do not repeat `age-keygen -o` after a key exists because that would risk
replacing the identity required to decrypt existing secrets.

Print only the public recipient:

```bash
age-keygen -y /Users/vanloc1808/.config/sops/age/keys.txt
```

The result begins with `age1`. The public recipient is safe to commit. The
`AGE-SECRET-KEY-...` line inside `keys.txt` is private and must never enter Git,
terminal output, screenshots, chat, or CI logs.

Create at least one encrypted offline backup of `keys.txt`. Losing every copy
means the repository's secrets cannot be recovered. Anyone obtaining a copy
can decrypt them.

#### Use the same identity on another Mac

The identity currently lives at:

```text
/Users/vanloc1808/.config/sops/age/keys.txt
```

This is the same location as `~/.config/sops/age/keys.txt` for the
`vanloc1808` account. It is not stored in either Git repository.

Only place the production identity on a company-managed device if its security
policy permits personal production credentials. If permitted, transfer
`keys.txt` through an encrypted private channel, such as an encrypted removable
drive, an end-to-end encrypted password manager, or a direct AirDrop that you
verify. Do not use Git, email, chat, a shared company drive, or a shell command
that prints the file.

After the transferred file is available at a temporary private path on the
other Mac, install it into the canonical location:

```bash
install -d -m 700 "$HOME/.config/sops/age"
install -m 600 "/path/to/temporarily-transferred/keys.txt" \
  "$HOME/.config/sops/age/keys.txt"
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"
age-keygen -y "$SOPS_AGE_KEY_FILE"
```

The final command prints only the public `age1...` recipient. Confirm it
matches the recipient in `arcana-deployment/.sops.yaml`. Once verified, remove
the temporary transferred copy using the secure-deletion or managed-device
procedure appropriate for that storage location. Do not generate a new Age
identity on the company laptop for these existing encrypted files.

### 15.3 Add the SOPS policy

Create `.sops.yaml` at the root of `arcana-deployment`:

```yaml
creation_rules:
  - path_regex: apps/arcana/overlays/production/.*\.sops\.ya?ml$
    encrypted_regex: ^(data|stringData)$
    age: REPLACE_WITH_YOUR_AGE_PUBLIC_RECIPIENT
```

Replace the placeholder with the `age1...` public recipient. This rule encrypts
values below Kubernetes `data` or `stringData` while keeping fields such as
`apiVersion`, `kind`, and `metadata.name` readable.

Commit `.sops.yaml`; do not commit `keys.txt`.

### 15.4 Strengthen the deployment repository ignore rules

Confirm `.gitignore` includes:

```gitignore
.env
.env.*
!.env.example
secrets/
*.agekey
keys.txt
*.dec.yaml
*.decrypted.yaml
```

These rules are a safety net, not the primary control. Always inspect staged
files before committing.

### 15.5 Create the encrypted backend Secret directly

Run from the root of `arcana-deployment`:

```bash
SOPS_AGE_KEY_FILE=/Users/vanloc1808/.config/sops/age/keys.txt \
  sops apps/arcana/overlays/production/backend-secret.sops.yaml
```

SOPS opens an editor. Enter a Kubernetes Secret like the following, replacing
each placeholder inside the editor with the real production value:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: arcana-backend-secrets
type: Opaque
stringData:
  JWT_SECRET_KEY: REPLACE_ME
  SQLALCHEMY_DATABASE_URL: REPLACE_ME
  OPENAI_API_KEY: REPLACE_ME
```

Add credentials only for features enabled in production. Examples include:

- `MAIL_USERNAME`, `MAIL_PASSWORD`, and `MAIL_FROM`
- Cloudflare R2 credentials
- Lemon Squeezy credentials and webhook secret
- Ethereum RPC credentials
- Slack webhook or bot credentials
- Web Push private key

Do not move non-sensitive settings into this file merely because they are
environment variables. Keep ordinary configuration in the ConfigMap.

When the editor is saved and closed, SOPS writes the encrypted form directly to
the repository. There should be no intermediate plaintext file.

### 15.6 Verify that encryption actually occurred

Inspect the encrypted file:

```bash
sed -n '1,120p' apps/arcana/overlays/production/backend-secret.sops.yaml
```

The values under `stringData` must contain SOPS `ENC[...]` payloads, and the
file must include a top-level `sops` metadata section. Stop immediately if any
real credential is readable.

Test decryption without writing plaintext to disk:

```bash
SOPS_AGE_KEY_FILE=/Users/vanloc1808/.config/sops/age/keys.txt \
  sops --decrypt apps/arcana/overlays/production/backend-secret.sops.yaml \
  | kubeconform -strict -summary -exit-on-error
```

Expected result:

```text
Summary: 1 resource found parsing stdin - Valid: 1, Invalid: 0, Errors: 0, Skipped: 0
```

This pipeline exposes decrypted data only through process memory and the pipe;
it does not create a decrypted file.

### 15.7 Confirm that Git contains no plaintext secrets

Review the exact staged content before committing:

```bash
git status
git diff -- .sops.yaml .gitignore apps/arcana/overlays/production/backend-secret.sops.yaml
git diff --check
```

Do not paste the diff into chat because encrypted files can still reveal Secret
key names and infrastructure metadata. Confirm locally that all real values are
encrypted.

Then commit:

```bash
git add .sops.yaml .gitignore apps/arcana/overlays/production/backend-secret.sops.yaml
git commit -m "security: add encrypted backend secret configuration"
git push origin main
```

Do not add `backend-secret.sops.yaml` directly to Kustomize's `resources` list.
Kubernetes cannot consume SOPS ciphertext. The next infrastructure phase will
install K3s and Argo CD, then configure a pinned decryption integration before
the Secret participates in reconciliation.

## 16. Checkpoint and inspect the VPS before installing K3s

Do not install K3s immediately. First preserve the completed GitOps work and
inspect the VPS read-only. The current production Docker/Traefik stack may
already own ports 80 and 443, which conflicts with K3s's bundled Traefik and
ServiceLB defaults.

### 16.1 Finish the current repository checkpoint

Before committing, resolve every `REPLACE_WITH_...` entry in
`apps/arcana/base/backend-configmap.yaml`. Replace each with its real
non-sensitive value or remove it if the integration is disabled.

Confirm the Argo CD Application has `revisionHistoryLimit` directly under
`spec`, not nested inside `syncPolicy`:

```yaml
spec:
  # source, destination, and other fields

  syncPolicy:
    automated:
      enabled: true
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - PruneLast=true

  revisionHistoryLimit: 10
```

Run the local checks from `arcana-deployment`:

```bash
kubectl kustomize apps/arcana/overlays/production \
  | kubeconform -strict -summary -exit-on-error

SOPS_AGE_KEY_FILE=/Users/vanloc1808/.config/sops/age/keys.txt \
  sops filestatus apps/arcana/overlays/production/backend-secret.sops.yaml

rg -n 'REPLACE_WITH_|commonLabels|tarot-redis' \
  apps bootstrap || true

git diff --check
git status
```

Expected results:

- Kustomize produces four valid resources: Namespace, ConfigMap, Service, and
  Deployment.
- SOPS reports `{"encrypted":true}`.
- The placeholder/stale-name search produces no output.
- `git diff --check` succeeds.
- Git lists only the files intentionally changed in this phase.

Review the encrypted Secret locally without posting its diff. Then commit all
current deployment-repository changes together:

```bash
git add \
  .gitignore \
  .sops.yaml \
  README.md \
  apps/arcana/base/backend-configmap.yaml \
  apps/arcana/base/backend-deployment.yaml \
  apps/arcana/overlays/production/backend-secret.sops.yaml \
  bootstrap/argocd/arcana-production.yaml

git commit -m "security: configure encrypted backend deployment secrets"
git push origin main
git status
```

The final `git status` should report a clean working tree.

### 16.2 Understand the machine boundary

Run the following commands over an SSH session on the VPS, not on the MacBook.
They are read-only and must not stop or reconfigure any current service:

```bash
cat /etc/os-release
uname -m
nproc
free -h
df -h /
hostnamectl
systemd-detect-virt
ip -br address
ip route
sudo ss -lntup
```

If Docker is installed, also run:

```bash
docker version --format 'Docker server: {{.Server.Version}}'
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
docker network ls
```

Inspect service and firewall state without changing it:

```bash
systemctl is-active docker || true
systemctl is-active traefik || true
systemctl is-active k3s || true
sudo ufw status verbose || true
```

Do not run commands that print container environment variables, Docker inspect
output, private keys, tokens, or application `.env` contents.

### 16.3 Evaluate the preflight results

Record these facts in `docs/bootstrap.md` without including public IP addresses
or credentials:

- Linux distribution and version
- CPU architecture
- vCPU, memory, root-disk capacity, and free space
- Virtualization/provider type, if identified
- Whether Docker and the current Compose deployment are active
- Which process owns TCP ports 80 and 443
- Whether TCP 6443 is already occupied
- Active firewall mechanism

K3s itself requires at least 2 CPU cores and 2 GB RAM for a server node, before
application workloads. For this single-node ArcanaAI cluster with Argo CD,
backend, frontend, Redis, and Celery, use 4 vCPU and 8 GB RAM as the practical
starting target when possible. SSD storage is strongly preferred.

### 16.4 Do not expose single-node cluster ports broadly

The eventual firewall policy should expose:

- TCP 80 and 443 publicly for application traffic
- TCP 22 only from trusted administration sources, where practical
- TCP 6443 only from trusted administration sources or a private VPN

A single-node cluster does not need Flannel VXLAN port 8472 or kubelet port
10250 exposed to the public Internet. K3s documentation explicitly warns that
8472 must not be exposed publicly.

Do not change the firewall during this preflight. A bad firewall change can
disconnect the SSH session or interrupt the existing production deployment.

### 16.5 Identify the Traefik cutover constraint

K3s normally installs Traefik and ServiceLB. If the current Docker deployment
already publishes ports 80 and 443, both ingress stacks cannot bind those host
ports simultaneously.

The safe migration design is:

1. Keep the current Compose deployment serving production.
2. Install K3s without taking over ports 80 and 443 during the staging phase.
3. Deploy and test ArcanaAI inside K3s through temporary local access or a
   non-production endpoint.
4. Schedule the ingress/DNS cutover only after the K3s workloads are healthy.
5. Preserve a time-bounded rollback to Compose.

Do not choose K3s installation flags until the VPS preflight confirms the OS,
firewall, existing Traefik deployment, and occupied ports. The next section
will turn those facts into a pinned K3s configuration and installation command.

## 17. Interpret the ArcanaAI VPS preflight

The inspected VPS has the following relevant characteristics:

| Area | Observed state | Assessment |
|---|---|---|
| Operating system | Ubuntu 24.04 LTS on x86-64 | Suitable for K3s |
| Virtualization | KVM | Suitable |
| Compute | 6 vCPU and approximately 11 GiB RAM | Sufficient for the planned single-node stack |
| Swap | 1 GiB, lightly used | Acceptable; continue monitoring memory pressure |
| Root disk | 63 GiB total, 18 GiB free, 73% used | Workable for staged installation; monitor closely during parallel operation |
| Existing ingress | Docker publishes TCP 80 and 443 | Conflicts with bundled K3s Traefik/ServiceLB during parallel migration |
| Kubernetes API | TCP 6443 appears unused | Available for K3s, subject to firewall restriction |
| OpenVPN | UDP 1194 and `tun0` are active | Unrelated to Kubernetes administration for this deployment |
| WireGuard | UDP 51820 and `wg0` are active | Do not select K3s Flannel WireGuard on its default port |
| Docker networks | `172.17.0.0/16` through `172.19.0.0/16` are present | No observed conflict with default K3s pod/service CIDRs |
| Host Redis | Bound to loopback only | Does not conflict with the future in-cluster Redis Service |
| Public addressing | Public IPv4 and IPv6 are configured | Firewall policy must cover both address families |

Do not record the VPS's public addresses in this repository. They are not
credentials, but keeping unnecessary infrastructure identifiers out of Git
reduces exposure.

### 17.1 Installation decisions from the current evidence

Use these decisions for the staging installation:

- Keep the current Docker/Compose production deployment running.
- Use the default Flannel VXLAN backend, not `wireguard-native`, because the
  host already uses UDP 51820 for WireGuard.
- Keep the default K3s pod CIDR `10.42.0.0/16` and service CIDR
  `10.43.0.0/16`; neither conflicts with the observed host/VPN/Docker routes.
- Initially disable K3s's packaged Traefik and ServiceLB so they cannot compete
  with Docker for ports 80 and 443.
- Do not add a public UFW rule for TCP 6443. Administer the Kubernetes API
  through an SSH local-forward from the MacBook.
- Do not expose UDP 8472 to the Internet. A single node needs no public VXLAN
  access.
- Proceed with the observed 18 GiB free, but check disk space after installing
  K3s, after installing Argo CD, and after deploying each application slice.
  Pause the migration if free space approaches 10 GiB.

Disabling packaged Traefik during staging does not abandon Traefik. It delays
the Kubernetes ingress takeover until ArcanaAI is healthy inside K3s and the
production cutover is scheduled.

### 17.2 Record the completed Docker and firewall inventory

The completed inventory establishes the following facts:

- Docker 29.6.2 is active; K3s is not installed or active.
- The Docker `traefik:v3.7.1` container owns public TCP 80 and 443 for both
  IPv4 and IPv6.
- All 23 Docker images are used by active containers, so Docker reports no
  reclaimable image space.
- Docker volumes occupy approximately 2.1 GiB, with only about 219 MiB marked
  reclaimable. Do not prune volumes merely to recover this small amount.
- UFW is active with default-deny incoming and routed traffic, but Docker also
  maintains its own nftables forwarding and NAT rules.
- TCP 6443 and UDP 8472 are not currently exposed.
- Qdrant ports 6333 and 6334 are published by Docker and broadly allowed by
  UFW for IPv4 and IPv6. Review whether that public exposure is intentional as
  a separate security task; do not change it during K3s installation.
- UFW contains duplicate and potentially stale rules, including TCP/UDP 22,
  3001, and 5173. Clean these only after mapping every rule to its owning
  service and preserving an active SSH session.

These were the read-only commands used to establish the inventory:

```bash
docker version --format 'Docker server: {{.Server.Version}}'
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
docker network ls
docker system df

systemctl is-active docker || true
systemctl is-active traefik || true
systemctl is-active k3s || true

sudo ufw status verbose || true
sudo nft list ruleset
```

The `nft` output may be long. Do not post or commit the complete ruleset if it
contains provider-specific addressing.

Confirm which Docker container owns public ingress:

```bash
docker ps \
  --filter publish=80 \
  --filter publish=443 \
  --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
```

Do not stop, restart, reconfigure, or remove that container during staging.

### 17.3 Finish disk attribution without deleting anything

K3s and Docker use separate container runtimes and image stores. During
migration, the VPS can temporarily hold duplicate ArcanaAI images. The
inspection found approximately 14 GiB under `/var/lib/docker`, 2.2 GiB under
`/var/log`, and 1.8 GiB of systemd journals. Docker reports no reclaimable
images because every image has an active container. Therefore, `docker system
prune` is not useful here and must not be used as a generic cleanup step.

The root-level inspection attributes the approximately 46 GiB in use as
follows:

- `/home`: approximately 19 GiB
- `/var`: approximately 17 GiB, including approximately 14 GiB of Docker data
- `/usr`: approximately 5.4 GiB
- `/root`: approximately 4 GiB
- all other top-level directories: comparatively small

Do not attempt to clean `/usr`. The remaining optional cleanup candidates are
under `/home` and `/root`, but their contents must be identified first. Run:

```bash
sudo du -xhd1 /home 2>/dev/null | sort -h
sudo du -xhd1 /root 2>/dev/null | sort -h
```

If one child directory is unexpectedly large, inspect only that directory one
level deeper before deciding whether cleanup is safe. Do not delete anything
as part of this inspection. Repositories, databases, Docker bind mounts,
backups, and application uploads must be treated as active data until proven
otherwise.

The second-level inspection found the largest consumers to be:

- `/home/vanloc1808`: approximately 15 GiB
- `/home/openclaw`: approximately 3.8 GiB
- `/root/.warp`: approximately 3.5 GiB
- `/home/linuxbrew`: approximately 251 MiB
- `/root/mysql`: approximately 195 MiB

No cleanup is required before the staged K3s installation. Treat the two home
directories as active user data. Treat `/root/.warp` as tool state unless its
owner and purpose are verified. If additional free space is needed later,
inspect the selected directory another level deeper before removing anything.

The commands already completed were:

```bash
lsblk -o NAME,SIZE,FSTYPE,MOUNTPOINTS
docker system df -v
sudo journalctl --disk-usage
sudo du -xhd1 /var/lib | sort -h
sudo du -xhd1 /var/log | sort -h
```

Do not run `docker system prune`, delete volumes, truncate logs, or remove files
based only on aggregate size. First identify which images, volumes, and logs
belong to active services. Docker volumes may contain persistent application or
monitoring data.

Eighteen GiB free is enough to begin this staged single-node deployment. The
earlier 25-30 GiB figure was a conservative operational buffer, not a K3s
minimum. Because Docker and K3s/containerd keep separate image stores, measure
free space at every installation checkpoint:

```bash
df -h /
sudo du -sh /var/lib/rancher 2>/dev/null || true
```

Use 10 GiB free as the stop-and-investigate threshold during migration. Do not
continue pulling workloads below that point. If the completed stack settles
close to the threshold, expand the disk rather than relying on recurring
manual deletion.

### 17.4 Administer K3s through an SSH tunnel

This MacBook can already SSH directly to the VPS, so Kubernetes administration
does not depend on OpenVPN or WireGuard. Keep TCP 6443 closed in UFW and create
a local SSH forward only while using `kubectl` from the MacBook:

```bash
ssh -N -L 16443:127.0.0.1:6443 <SSH_USER>@<VPS_ADDRESS>
```

Keep that terminal open. A later step will copy the K3s kubeconfig to the
MacBook, store it with mode `0600`, and change its server address to
`https://127.0.0.1:16443`.

The control-plane model is:

```text
MacBook kubectl --> localhost:16443 --> SSH --> VPS localhost:6443 --> K3s API
Internet -----------------------------------X VPS public TCP 6443
```

The K3s admin kubeconfig grants full cluster-administrator access. Never commit
it, place it in `arcana-deployment`, or send it through chat.

### 17.5 Stop point before installation

Do not install K3s until all of the following are known:

- [x] Docker Traefik owns ports 80 and 443 for IPv4 and IPv6
- [x] UFW is active and Docker also manages nftables rules
- [x] TCP 6443 will remain closed publicly and use an SSH local-forward
- [x] The current 18 GiB free is accepted for staged installation
- [x] Top-level root-disk usage has been attributed with `du -xhd1 /`
- [x] Optional `/home` and `/root` disk consumers have been identified without
      deleting anything; no pre-install cleanup is planned
- [x] K3s release `v1.36.3+k3s1` has been resolved from the stable channel

### 17.6 Resolve the current stable K3s release

Do not copy a version from this guide because the stable channel changes over
time. On the VPS, resolve the channel without installing anything:

```bash
curl -fsSL -o /dev/null \
  -w '%{url_effective}\n' \
  https://update.k3s.io/v1-release/channels/stable
```

The result should be an official GitHub release URL ending in a version such
as `vX.Y.Z+k3sN`. Record that exact version for the installation command. Do
not run the K3s installer yet.

Once the version is known, the next section will create
`/etc/rancher/k3s/config.yaml` with staging-safe settings and install that
pinned K3s release without taking over production ingress.

## 18. Install the staging K3s server

This phase changes the VPS by installing K3s. It must not stop or reconfigure
the existing Docker deployment. The current Docker Traefik continues serving
production on ports 80 and 443.

### 18.1 Create the persistent K3s configuration

Run on the VPS:

```bash
sudo install -d -m 0755 /etc/rancher/k3s
sudoedit /etc/rancher/k3s/config.yaml
```

Enter exactly:

```yaml
write-kubeconfig-mode: "0600"
flannel-backend: vxlan
secrets-encryption: true
secrets-encryption-provider: secretbox
disable:
  - traefik
  - servicelb
node-label:
  - "arcana.ai/role=single-node"
```

Save the file, then verify it without printing unrelated system files:

```bash
sudo sed -n '1,120p' /etc/rancher/k3s/config.yaml
```

Why these settings:

- `write-kubeconfig-mode: "0600"` keeps the admin kubeconfig owner-readable
  only.
- VXLAN avoids conflicting with the host's existing WireGuard port.
- Kubernetes Secret encryption at rest is enabled with `secretbox`.
- Packaged Traefik and ServiceLB are disabled during staging so K3s cannot take
  over ports 80 and 443.
- The node label documents this server's intended role without coupling
  workloads to its hostname.

Do not add `tls-san`, public IP addresses, Docker registry credentials, SOPS
Age identities, or application secrets to this file.

### 18.2 Download the official installer for inspection

Run on the VPS:

```bash
curl -fsSL https://get.k3s.io -o /tmp/install-k3s.sh
less /tmp/install-k3s.sh
```

Exit `less` with `q`. Confirm that it is the K3s installation script and that
the download did not produce an HTML error page:

```bash
head -n 5 /tmp/install-k3s.sh
```

Do not modify or reuse an older installer saved elsewhere.

### 18.3 Install the pinned release

Run on the VPS:

```bash
sudo env INSTALL_K3S_VERSION='v1.36.3+k3s1' \
  sh /tmp/install-k3s.sh
```

The persistent YAML file supplies the server settings, while
`INSTALL_K3S_VERSION` pins the binary version. Do not add installation flags to
the command; keeping the configuration in `/etc/rancher/k3s/config.yaml`
prevents settings from being lost when K3s is upgraded later.

### 18.4 Verify K3s without changing production traffic

Run on the VPS:

```bash
sudo systemctl is-active k3s
sudo k3s --version
sudo k3s kubectl get nodes -o wide
sudo k3s kubectl get pods -A
sudo k3s kubectl get svc -A
sudo ss -lntup | grep -E ':(80|443|6443)\b'
docker ps --filter name=traefik \
  --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
sudo ufw status | grep 6443 || true
df -h /
sudo du -sh /var/lib/rancher
```

Expected results:

- `k3s` is active and reports exactly `v1.36.3+k3s1`.
- The single node becomes `Ready`.
- CoreDNS, metrics-server, and local-path-provisioner become healthy. There
  should be no K3s Traefik or ServiceLB pods.
- Docker Traefik still owns host ports 80 and 443.
- UFW has no public allow rule for TCP 6443.
- Root-disk free space remains above the 10 GiB stop threshold.

K3s may listen on host TCP 6443 even though UFW blocks unsolicited public
connections. Do not add a public firewall rule for it.

If the node is not `Ready`, any system pod repeatedly restarts, Docker Traefik
loses ports 80/443, or free disk falls below 10 GiB, stop here and collect:

```bash
sudo systemctl status k3s --no-pager
sudo journalctl -u k3s -n 200 --no-pager
sudo k3s kubectl get pods -A -o wide
```

Do not uninstall, reinstall, alter UFW, or restart Docker while diagnosing the
first failure.

## 19. Configure secure workstation kubectl access

K3s is now healthy, but TCP 6443 must remain closed to the public Internet.
Use a dedicated kubeconfig and an SSH local-forward so a trusted administration
workstation can
administer the cluster without changing UFW.

### 19.1 Open the SSH tunnel

On the administration workstation, open a separate terminal and run:

```bash
ssh -N -L 16443:127.0.0.1:6443 <SSH_USER>@<VPS_ADDRESS>
```

Keep this process running while using `kubectl`. The command normally produces
no output. If local port 16443 is already occupied, identify its owner before
choosing a different unused local port; use the same port in the kubeconfig
update below.

Do not add a UFW allow rule for TCP 6443.

### 19.2 Copy the K3s kubeconfig without displaying it

In another workstation terminal, confirm `kubectl` is installed:

```bash
kubectl version --client
```

Create a dedicated local kubeconfig. The following block refuses to overwrite
an existing file, uses a private temporary file, and does not print the
cluster-admin credentials:

```bash
install -d -m 700 "$HOME/.kube"
ARCANA_KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"

if test -e "$ARCANA_KUBECONFIG"; then
  echo "Refusing to overwrite $ARCANA_KUBECONFIG" >&2
  exit 1
fi

ARCANA_KUBECONFIG_TMP="$(mktemp "$HOME/.kube/arcana-k3s.yaml.tmp.XXXXXX")" || exit 1
chmod 600 "$ARCANA_KUBECONFIG_TMP"

if ! ssh <SSH_USER>@<VPS_ADDRESS> \
  'sudo cat /etc/rancher/k3s/k3s.yaml' >"$ARCANA_KUBECONFIG_TMP"; then
  rm -f "$ARCANA_KUBECONFIG_TMP"
  echo 'Kubeconfig copy failed; no local kubeconfig was installed.' >&2
  exit 1
fi

if ! kubectl --kubeconfig="$ARCANA_KUBECONFIG_TMP" \
  config set-cluster default --server=https://127.0.0.1:16443; then
  rm -f "$ARCANA_KUBECONFIG_TMP"
  echo 'Kubeconfig update failed; no local kubeconfig was installed.' >&2
  exit 1
fi

if test -e "$ARCANA_KUBECONFIG"; then
  rm -f "$ARCANA_KUBECONFIG_TMP"
  echo "Refusing to overwrite $ARCANA_KUBECONFIG" >&2
  exit 1
fi

mv "$ARCANA_KUBECONFIG_TMP" "$ARCANA_KUBECONFIG"
```

If remote `sudo` requires a terminal and the copy fails, stop and diagnose the
SSH/sudo policy. Do not weaken sudo configuration, make the K3s kubeconfig
world-readable, or paste its contents into the terminal or chat.

The resulting file is a full cluster-administrator credential. Keep it outside
both repositories, retain mode `0600`, and never commit or share it.

### 19.3 Verify tunneled cluster access

With the SSH tunnel still running, use the dedicated kubeconfig explicitly:

```bash
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"
test "$(stat -f '%Lp' "$KUBECONFIG")" = 600
kubectl cluster-info
kubectl get nodes -o wide
kubectl get pods -A
```

Expected results:

- `kubectl cluster-info` reaches `https://127.0.0.1:16443`.
- The single K3s node is `Ready`.
- CoreDNS, metrics-server, and local-path-provisioner remain `Running`.
- No packaged Traefik or ServiceLB workload appears.

`stat -f` above is the macOS form. On a Linux workstation, use
`stat -c '%a' "$KUBECONFIG"` instead.

When administration is finished, exit the tunnel with `Ctrl-C`. A closed
tunnel should make this dedicated kubeconfig unable to reach the API; that is
the intended security boundary.

Do not apply the ArcanaAI overlay yet. Argo CD and its pinned SOPS decryption
integration must be installed before the encrypted backend Secret participates
in reconciliation.

## 20. Install the pinned Argo CD release

Install Argo CD while the existing Docker deployment continues to serve
production. Argo CD remains internal to Kubernetes during staging; do not
create an Ingress, NodePort, or LoadBalancer Service for it.

The release selected for this installation is `v3.4.5`, the current stable
non-prerelease release when this section was written. The manifest URL is
pinned to that tag rather than the mutable `stable` branch. Review Argo CD
release notes before choosing a newer version.

### 20.1 Recheck the staging safety boundaries

**Run on:** the administration workstation. Commands beginning with `ssh vps`
execute their quoted portion on the VPS; all `kubectl` commands run locally
through the Section 19 SSH tunnel.

Keep the Section 19 SSH tunnel running and use the dedicated kubeconfig:

```bash
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"
kubectl get nodes
kubectl get pods -A
ssh vps 'df -h /; sudo du -sh /var/lib/rancher'
```

Continue only when the node is `Ready`, the existing system Pods are healthy,
and root-disk free space remains above the 10 GiB stop threshold.

Confirm once more that Docker Traefik owns production ingress:

```bash
ssh vps \
  "docker ps --filter name=traefik --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'"
```

Do not proceed if ports 80 or 443 are no longer published by the existing
Docker Traefik container.

### 20.2 Download and inspect the pinned manifest

**Run on:** the administration workstation, not the VPS. The downloaded file
is temporary local input to `kubectl`.

Refuse to overwrite an earlier download so an unexpected local file is not
silently replaced:

```bash
ARGOCD_MANIFEST=/tmp/argocd-install-v3.4.5.yaml
if test -e "$ARGOCD_MANIFEST"; then
  echo "Refusing to overwrite $ARGOCD_MANIFEST" >&2
  exit 1
fi

curl --proto '=https' --tlsv1.2 -fsSL \
  https://raw.githubusercontent.com/argoproj/argo-cd/v3.4.5/manifests/install.yaml \
  -o "$ARGOCD_MANIFEST"

test -s "$ARGOCD_MANIFEST"
sha256sum "$ARGOCD_MANIFEST"
rg -n '^kind: (CustomResourceDefinition|ClusterRole|ClusterRoleBinding|Deployment|StatefulSet|Service)$' \
  "$ARGOCD_MANIFEST"
```

Record the SHA-256 output in the local operations notes for this installation.
Do not commit a downloaded upstream manifest unless the deployment repository
later adopts vendoring intentionally.

The installation requires cluster-wide CRDs and RBAC because this Argo CD
instance will manage the local cluster. The official manifest also creates an
internal `argocd-server` Service; it does not take over host ports 80 or 443.

### 20.3 Install Argo CD server-side

**Run on:** the administration workstation, with the Section 19 SSH tunnel and
`KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"` still active. Although `kubectl` runs
locally, these commands change the K3s cluster on the VPS.

Create the namespace, then apply the pinned manifest from the local file:

```bash
kubectl create namespace argocd
kubectl apply -n argocd --server-side --force-conflicts \
  -f /tmp/argocd-install-v3.4.5.yaml
```

Server-side apply is required because some Argo CD CRDs exceed the annotation
size supported by client-side apply. `--force-conflicts` is appropriate for
this first installation from the official manifest; revisit ownership before
using it for future customized upgrades.

If either command fails, stop and inspect the error. Do not delete the
namespace, retry with a different version, or loosen cluster security controls
without identifying the cause.

### 20.4 Wait for Argo CD to become healthy

**Run on:** the administration workstation. The `kubectl` commands use the SSH
tunnel; commands beginning with `ssh vps` run their quoted checks directly on
the VPS.

```bash
kubectl wait -n argocd --for=condition=Available deployment --all --timeout=5m
kubectl rollout status -n argocd statefulset/argocd-application-controller \
  --timeout=5m
kubectl get pods -n argocd -o wide
kubectl get svc -n argocd
```

Expected results:

- All Argo CD Pods become `Running` and ready without repeated restarts.
- The application controller StatefulSet completes its rollout.
- Argo CD Services remain `ClusterIP`; there is no `NodePort` or
  `LoadBalancer` Service.
- No Argo CD Ingress exists.

Verify those exposure constraints explicitly:

```bash
kubectl get svc -n argocd \
  -o custom-columns='NAME:.metadata.name,TYPE:.spec.type,CLUSTER-IP:.spec.clusterIP'
kubectl get ingress -n argocd
ssh vps "sudo ss -lntup | grep -E ':(80|443|6443)\\b'"
ssh vps 'df -h /; sudo du -sh /var/lib/rancher'
```

Docker Traefik must still own host ports 80 and 443, TCP 6443 must not have a
public UFW allow rule, and disk space must remain above 10 GiB.

### 20.5 Stop before connecting the deployment repository

**Action location:** no command is required in this subsection. Leave the
deployment repository unchanged until the next integration phase is defined.

Do not apply `bootstrap/argocd/arcana-production.yaml` yet. The repository is
private, and the production overlay depends on SOPS decryption. The next phase
must configure, pin, and verify all of the following before Argo CD reconciles
ArcanaAI:

1. Read-only GitHub repository access.
2. A KSOPS or equivalent SOPS config-management plugin.
3. The Age identity as a Kubernetes Secret without printing or committing it.
4. Kustomize generation of the decrypted `arcana-backend-secrets` resource.

Do not retrieve or expose the Argo CD initial administrator password merely to
complete this phase. Cluster health can be verified with `kubectl`, and UI
access can be added later through a separate local port-forward if needed.

## 21. Configure read-only Argo CD repository access

Give Argo CD access to the private `vanloc1808/arcana-deployment` repository
with a dedicated GitHub deploy key. Deploy keys are scoped to one repository
and are read-only by default. Do not reuse a personal SSH key, GitHub account
token, or CI credential.

This phase registers repository credentials only. It does not create the Argo
CD Application, reconcile workloads, or configure SOPS decryption.

### 21.1 Generate a dedicated deploy key

**Run on:** the administration workstation. Store the private key outside both
Git repositories.

The following block refuses to overwrite an existing key:

```bash
ARGOCD_REPO_KEY="$HOME/.ssh/arcana-deployment-argocd"

if test -e "$ARGOCD_REPO_KEY" || test -e "$ARGOCD_REPO_KEY.pub"; then
  echo "Refusing to overwrite an existing Argo CD deploy key" >&2
  exit 1
fi

install -d -m 700 "$HOME/.ssh"
ssh-keygen -t ed25519 \
  -C 'argocd@arcana-production' \
  -f "$ARGOCD_REPO_KEY" \
  -N ''
chmod 600 "$ARGOCD_REPO_KEY"
chmod 644 "$ARGOCD_REPO_KEY.pub"
ssh-keygen -lf "$ARGOCD_REPO_KEY.pub"
```

The private key intentionally has no passphrase because Argo CD must use it
non-interactively. Its scope and read-only GitHub permission limit its power.
The private file is still a credential: never print, commit, or send it
through chat.

### 21.2 Add the public key to GitHub as read-only

**Run on:** the administration workstation and the GitHub website.

Print only the public key:

```bash
cat "$HOME/.ssh/arcana-deployment-argocd.pub"
```

Open the private repository on GitHub and go to:

```text
vanloc1808/arcana-deployment
  -> Settings
  -> Deploy keys
  -> Add deploy key
```

Use:

- Title: `argocd-arcana-production`
- Key: the complete public `ssh-ed25519 ...` line
- Allow write access: **unchecked**

After saving, GitHub must show the deploy key as read-only. Stop if repository
or organization policy prohibits deploy keys; do not substitute a broadly
scoped personal access token without a separate design review.

### 21.3 Verify the deploy key from the workstation

**Run on:** the administration workstation. This is a read-only Git operation
and does not change the repository.

First require an existing trusted `github.com` host-key entry. Do not bypass
host-key checking or automatically trust an unexpected key:

```bash
ssh-keygen -F github.com >/dev/null || {
  echo 'github.com is missing from known_hosts; verify its host key first.' >&2
  exit 1
}

ARGOCD_REPO_KEY="$HOME/.ssh/arcana-deployment-argocd"
GIT_SSH_COMMAND="ssh -i $ARGOCD_REPO_KEY -o IdentitiesOnly=yes" \
  git ls-remote git@github.com:vanloc1808/arcana-deployment.git HEAD
```

Expected output is one commit SHA followed by `HEAD`. An authentication error
usually means the wrong public key was added or the deploy key is attached to
the wrong repository. A host-key error must be investigated against GitHub's
published SSH host-key fingerprints; do not use
`StrictHostKeyChecking=no`.

### 21.4 Create the Argo CD repository Secret

**Run on:** the administration workstation, with the Section 19 SSH tunnel and
dedicated kubeconfig active. These commands create a credential Secret in K3s
but do not write plaintext manifests to disk.

K3s Secret encryption at rest was enabled in Section 18. Cluster
administrators and the Argo CD repo-server can still read this credential, so
least privilege remains necessary.

```bash
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"
ARGOCD_REPO_KEY="$HOME/.ssh/arcana-deployment-argocd"

test -r "$ARGOCD_REPO_KEY"
test "$(stat -c '%a' "$ARGOCD_REPO_KEY")" = 600

if kubectl get secret -n argocd arcana-deployment-repo >/dev/null 2>&1; then
  echo 'Refusing to replace the existing Argo CD repository Secret' >&2
  exit 1
fi

kubectl create secret generic arcana-deployment-repo \
  --namespace=argocd \
  --from-literal=type=git \
  --from-literal=url=git@github.com:vanloc1808/arcana-deployment.git \
  --from-literal=project=default \
  --from-file=sshPrivateKey="$ARGOCD_REPO_KEY"

kubectl label secret arcana-deployment-repo \
  --namespace=argocd \
  argocd.argoproj.io/secret-type=repository
```

The key bytes travel from the protected local file through `kubectl` to the
Kubernetes API. Do not use `-o yaml`, `kubectl get secret ... -o yaml`, shell
tracing, or commands that decode Secret data.

### 21.5 Verify only non-secret metadata

**Run on:** the administration workstation.

Print the Secret type label and data key names without printing their values:

```bash
kubectl get secret -n argocd arcana-deployment-repo \
  -o go-template='{{index .metadata.labels "argocd.argoproj.io/secret-type"}}{{"\n"}}{{range $key, $value := .data}}{{printf "%s\n" $key}}{{end}}'

kubectl get pods -n argocd
```

Expected metadata output contains:

```text
repository
project
sshPrivateKey
type
url
```

Map key order is not significant. All Argo CD Pods must remain healthy. The
deploy-key test in Section 21.3 proves GitHub accepts the credential; a later
phase will verify Argo CD rendering after the SOPS plugin is installed.

### 21.6 Stop before SOPS integration

**Action location:** no command is required in this subsection.

Do not apply `bootstrap/argocd/arcana-production.yaml`. The current Argo CD
repo-server cannot decrypt `backend-secret.sops.yaml`, and Kubernetes cannot
consume SOPS ciphertext. The next section must install a pinned KSOPS/SOPS
config-management plugin, inject the Age identity without exposing it, update
the production Kustomization to generate the Secret, and validate rendering
before reconciliation begins.

Keep the local deploy-key private file protected until repository access has
been validated end to end. If it is ever exposed, remove the deploy key from
GitHub, delete the Kubernetes repository Secret, and create a new key pair.

## 22. Install the pinned KSOPS sidecar and register the encrypted Secret

Install KSOPS `v4.5.1` as an Argo CD config-management-plugin sidecar. This is
the current KSOPS release when this section was written and is explicitly
pinned instead of using `latest`.

The sidecar design keeps the Age identity out of the main repo-server
container, gives the plugin a separate `/tmp`, runs it as a non-root user, and
does not enable executable Kustomize plugins globally in `argocd-cm`. The
plugin receives repository files only when an Application explicitly selects
`ksops-v4.5.1`.

Argo CD config-management plugins are trusted code. Anyone who can modify the
selected repository can influence manifest generation. Keep repository write
access tightly controlled and review changes to generator definitions.

### 22.1 Add the KSOPS plugin configuration to the deployment repository

**Run on:** the administration workstation, from the root of the
`arcana-deployment` repository.

Create the directory and files:

```bash
mkdir -p bootstrap/argocd/ksops
touch bootstrap/argocd/ksops/plugin-configmap.yaml
touch bootstrap/argocd/ksops/repo-server-patch.yaml
```

Put this in `bootstrap/argocd/ksops/plugin-configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-ksops-plugin
  namespace: argocd
  labels:
    app.kubernetes.io/part-of: argocd
data:
  plugin.yaml: |
    apiVersion: argoproj.io/v1alpha1
    kind: ConfigManagementPlugin
    metadata:
      name: ksops
    spec:
      version: v4.5.1
      generate:
        command:
          - kustomize
        args:
          - build
          - --enable-alpha-plugins
          - --enable-exec
          - .
      preserveFileMode: false
      provideGitCreds: false
```

Put this in `bootstrap/argocd/ksops/repo-server-patch.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: ksops
          image: viaductoss/ksops:v4.5.1
          imagePullPolicy: IfNotPresent
          command:
            - /var/run/argocd/argocd-cmp-server
          env:
            - name: SOPS_AGE_KEY_FILE
              value: /home/argocd/.config/sops/age/keys.txt
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
            readOnlyRootFilesystem: true
            runAsNonRoot: true
            runAsUser: 999
            runAsGroup: 999
            seccompProfile:
              type: RuntimeDefault
          volumeMounts:
            - name: var-files
              mountPath: /var/run/argocd
            - name: plugins
              mountPath: /home/argocd/cmp-server/plugins
            - name: ksops-plugin-config
              mountPath: /home/argocd/cmp-server/config
              readOnly: true
            - name: ksops-age
              mountPath: /home/argocd/.config/sops/age
              readOnly: true
            - name: ksops-tmp
              mountPath: /tmp
      volumes:
        - name: ksops-plugin-config
          configMap:
            name: argocd-ksops-plugin
            items:
              - key: plugin.yaml
                path: plugin.yaml
        - name: ksops-age
          secret:
            secretName: sops-age
            defaultMode: 0444
        - name: ksops-tmp
          emptyDir: {}
```

The Age volume is mounted only into the KSOPS sidecar. Mode `0444` is needed
because Kubernetes mounts Secret files as root-owned while the sidecar runs as
UID 999; it does not make the key available outside that container. Do not
mount this Secret into the main repo-server container.

The separate `ksops-tmp` volume is intentional. Argo CD warns against sharing
the repo-server's `/tmp` volume with a plugin sidecar because filesystem
separation mitigates path-traversal attacks.

### 22.2 Register the encrypted backend Secret with KSOPS

**Run on:** the administration workstation, still in the
`arcana-deployment` repository.

Create `apps/arcana/overlays/production/backend-secret-generator.yaml`:

```yaml
apiVersion: viaduct.ai/v1
kind: ksops
metadata:
  name: arcana-backend-secret-generator
  annotations:
    config.kubernetes.io/function: |
      exec:
        path: ksops
files:
  - backend-secret.sops.yaml
```

Add the generator to
`apps/arcana/overlays/production/kustomization.yaml` without adding the
encrypted file to `resources`:

```yaml
generators:
  - backend-secret-generator.yaml
```

Update `bootstrap/argocd/arcana-production.yaml` so its existing `source`
selects the pinned plugin:

```yaml
spec:
  project: default

  source:
    repoURL: git@github.com:vanloc1808/arcana-deployment.git
    targetRevision: main
    path: apps/arcana/overlays/production
    plugin:
      name: ksops-v4.5.1
```

Retain `project: default` directly under `spec`; it is required by the Argo CD
Application schema. Do not change the destination or automated sync policy. Do
not apply this Application yet.

### 22.3 Validate the repository changes without exposing plaintext

**Run on:** the administration workstation, from `arcana-deployment`.

Confirm the local identity is readable and that its public recipient matches
the committed `.sops.yaml` recipient:

```bash
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"
test -r "$SOPS_AGE_KEY_FILE"
test "$(stat -c '%a' "$SOPS_AGE_KEY_FILE")" = 600
age-keygen -y "$SOPS_AGE_KEY_FILE"
rg -n 'age: age1' .sops.yaml
```

Both commands must show the same public `age1...` recipient. Neither command
prints the private identity.

Validate decryption and schema through a pipe without writing plaintext:

```bash
sops filestatus apps/arcana/overlays/production/backend-secret.sops.yaml

sops --decrypt apps/arcana/overlays/production/backend-secret.sops.yaml \
  | kubeconform -strict -summary -exit-on-error

rg -n 'ksops-v4\.5\.1|backend-secret-generator\.yaml|viaductoss/ksops:v4\.5\.1' \
  apps bootstrap
git diff --check
git status
```

Expected results:

- SOPS reports `{"encrypted":true}`.
- Kubeconform validates one Secret.
- The search finds the plugin name, generator, and pinned image.
- No plaintext credential or Age private key appears in Git.

Review the encrypted Secret locally without posting its diff. Then commit and
push the deployment-repository changes:

```bash
git add \
  apps/arcana/overlays/production/backend-secret-generator.yaml \
  apps/arcana/overlays/production/kustomization.yaml \
  bootstrap/argocd/arcana-production.yaml \
  bootstrap/argocd/ksops/plugin-configmap.yaml \
  bootstrap/argocd/ksops/repo-server-patch.yaml

git diff --cached --check
git commit -m "security: configure KSOPS secret decryption"
git push origin main
git status
```

### 22.4 Create the Age identity Secret without printing it

**Run on:** the administration workstation, with the Section 19 SSH tunnel and
dedicated kubeconfig active. The source file remains outside Git.

```bash
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"

test -r "$SOPS_AGE_KEY_FILE"
test "$(stat -c '%a' "$SOPS_AGE_KEY_FILE")" = 600

if kubectl get secret -n argocd sops-age >/dev/null 2>&1; then
  echo 'Refusing to replace the existing sops-age Secret' >&2
  exit 1
fi

kubectl create secret generic sops-age \
  --namespace=argocd \
  --from-file=keys.txt="$SOPS_AGE_KEY_FILE"
```

Do not use `-o yaml`, enable shell tracing, print the Secret, or decode its
data. K3s encrypts this Secret at rest, but cluster administrators and the
KSOPS sidecar can decrypt it.

Verify only its data key name:

```bash
kubectl get secret -n argocd sops-age \
  -o go-template='{{range $key, $value := .data}}{{printf "%s\n" $key}}{{end}}'
```

Expected output is only:

```text
keys.txt
```

### 22.5 Apply the plugin configuration and repo-server patch

**Run on:** the administration workstation, from `arcana-deployment`.
These commands change the Argo CD repo-server on the VPS.

Apply the non-secret plugin configuration first, then validate the Deployment
patch server-side without changing the live Deployment:

```bash
kubectl apply -f bootstrap/argocd/ksops/plugin-configmap.yaml

kubectl patch deployment argocd-repo-server \
  --namespace=argocd \
  --type=strategic \
  --patch-file=bootstrap/argocd/ksops/repo-server-patch.yaml \
  --dry-run=server \
  -o name
```

Expected dry-run output is:

```text
deployment.apps/argocd-repo-server
```

Only after the dry-run succeeds, apply the patch:

```bash
kubectl patch deployment argocd-repo-server \
  --namespace=argocd \
  --type=strategic \
  --patch-file=bootstrap/argocd/ksops/repo-server-patch.yaml
```

This rollout pulls `viaductoss/ksops:v4.5.1`. It does not expose a new Service
or port.

### 22.6 Verify the KSOPS sidecar without decrypting to output

**Run on:** the administration workstation.

```bash
kubectl rollout status -n argocd deployment/argocd-repo-server --timeout=5m
kubectl get pods -n argocd \
  -l app.kubernetes.io/name=argocd-repo-server \
  -o custom-columns='NAME:.metadata.name,READY:.status.containerStatuses[*].ready,RESTARTS:.status.containerStatuses[*].restartCount'

kubectl exec -n argocd deployment/argocd-repo-server \
  -c ksops -- kustomize version

kubectl get deployment -n argocd argocd-repo-server \
  -o jsonpath='{range .spec.template.spec.containers[?(@.name=="ksops")].volumeMounts[*]}{.name}{"\n"}{end}'

kubectl get pods -n argocd
```

Expected results:

- The repo-server Pod reports both containers ready.
- Kustomize executes successfully and reports a version containing
  `ksops.v4.5.1`, confirming the bundled KSOPS release.
- The sidecar volume list includes `ksops-age`, `ksops-plugin-config`,
  `ksops-tmp`, `plugins`, and `var-files`.
- All other Argo CD Pods remain healthy.

If the rollout fails, stop and collect only non-secret diagnostics:

```bash
kubectl describe pod -n argocd \
  -l app.kubernetes.io/name=argocd-repo-server
kubectl logs -n argocd deployment/argocd-repo-server -c ksops --tail=100
kubectl logs -n argocd deployment/argocd-repo-server \
  -c argocd-repo-server --tail=100
```

Do not print either Kubernetes Secret, weaken the sidecar security context, or
mount the Age identity into additional containers while diagnosing.

### 22.7 Stop before creating the Argo CD Application

**Action location:** no command is required in this subsection.

Do not apply `bootstrap/argocd/arcana-production.yaml` yet. The next phase must
stage the Application with automated sync disabled and verify that Argo CD can
clone the private repository and render exactly the expected resources through
`ksops-v4.5.1`. Keep reconciliation disabled afterward because Redis,
frontend, and Celery workloads are not yet present in the deployment
repository.

Argo CD caches generated manifests, including decrypted Secrets, in plaintext
in its Redis cache. The Redis Service remains internal and password-protected,
but this is an important part of the trust model: protect Argo CD namespace
access, backups, logs, and administrator credentials accordingly.

## 23. Stage the Argo CD Application without synchronization

Create the `arcana-production` Application so Argo CD can test private Git
access and KSOPS rendering, but prevent it from creating any Arcana resources.
The deployment repository currently contains only the backend slice; Redis,
frontend, Celery worker, and Celery Beat workloads are still missing.

Do not enable automated sync at the end of this phase.

### 23.1 Disable automated sync in Git

**Run on:** the administration workstation, from the root of the
`arcana-deployment` repository.

In `bootstrap/argocd/arcana-production.yaml`, change the existing automated
sync setting from:

```yaml
syncPolicy:
  automated:
    enabled: true
    prune: true
    selfHeal: true
    allowEmpty: false
```

to:

```yaml
syncPolicy:
  automated:
    enabled: false
    prune: true
    selfHeal: true
    allowEmpty: false
```

Keep `project: default`, `PruneLast=true`, and `revisionHistoryLimit: 10`
unchanged. Confirm that both `project` and `revisionHistoryLimit` remain
directly under `spec`, not inside `source` or `syncPolicy`.

Review and commit only this staging change:

```bash
git diff -- bootstrap/argocd/arcana-production.yaml
git diff --check
git status --short

git add bootstrap/argocd/arcana-production.yaml
git diff --cached --check
git commit -m "chore: stage Arcana application without synchronization"
git push origin main
git status
```

The final status must report a clean working tree.

### 23.2 Apply the disabled Application

**Run on:** the administration workstation, with the Section 19 SSH tunnel and
dedicated kubeconfig active. This creates only the Argo CD `Application`
object; automated sync is disabled.

Verify the disabled value locally before applying:

```bash
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"

rg -n -A 4 '^    automated:' bootstrap/argocd/arcana-production.yaml
```

The output must include `enabled: false`. Then apply:

```bash
kubectl apply -f bootstrap/argocd/arcana-production.yaml
```

Expected output is:

```text
application.argoproj.io/arcana-production created
```

If the Application already exists or the output says `configured`, stop and
inspect its current spec before continuing. Do not overwrite an unexplained
existing production Application.

### 23.3 Verify repository access and KSOPS rendering

**Run on:** the administration workstation. Give Argo CD a short reconciliation
interval, then run these commands; no fixed sleep is required.

```bash
kubectl get application -n argocd arcana-production

kubectl get application -n argocd arcana-production \
  -o custom-columns='NAME:.metadata.name,SYNC:.status.sync.status,HEALTH:.status.health.status,REVISION:.status.sync.revision'

kubectl get application -n argocd arcana-production \
  -o jsonpath='{range .status.conditions[*]}{.type}{": "}{.message}{"\n"}{end}'

kubectl get application -n argocd arcana-production \
  -o jsonpath='{range .status.resources[*]}{.kind}{"\t"}{.namespace}{"\t"}{.name}{"\t"}{.status}{"\n"}{end}' \
  | sort
```

Expected results after reconciliation:

- Sync status is `OutOfSync`; this is intentional.
- The revision is a Git commit SHA from `main`.
- The conditions command produces no output.
- The resource inventory contains exactly these five objects:
  - `Namespace/arcana`
  - `ConfigMap/arcana-backend-config`
  - `Deployment/arcana-backend`
  - `Service/arcana-backend`
  - `Secret/arcana-backend-secrets`
- The Secret appears by kind and name only; no decrypted value is printed.

The presence of `Secret/arcana-backend-secrets` proves the private repository
was cloned and the `ksops-v4.5.1` sidecar decrypted and rendered the encrypted
file successfully.

If status fields are initially empty, rerun the commands after Argo CD has had
time to reconcile. If a condition appears, stop and share only the condition
type and message. Do not print Application manifests, Kubernetes Secrets, or
repo-server cache contents while diagnosing.

### 23.4 Prove that synchronization remains disabled

**Run on:** the administration workstation.

```bash
kubectl get application -n argocd arcana-production \
  -o jsonpath='{.spec.syncPolicy.automated.enabled}{"\n"}'

kubectl get namespace arcana --ignore-not-found -o name
```

Expected results:

- The first command prints `false`.
- The namespace command prints nothing because Argo CD has not synchronized
  the desired resources.

If the `arcana` namespace exists unexpectedly, stop and inspect the
Application operation history and live resources. Do not delete the namespace
or its contents until their origin is understood.

### 23.5 Keep the Application in observation-only mode

**Action location:** no command is required in this subsection.

Leave `enabled: false` in both Git and the live Application. Do not press Sync
in the Argo CD UI, run `argocd app sync`, add a manual operation, or patch the
live Application to enable automation.

The next deployment-repository phases must add and validate, at minimum:

1. Redis Deployment or StatefulSet, Service, persistence decision, probes, and
   resource limits.
2. Frontend Deployment and internal Service.
3. Celery worker and Celery Beat workloads with appropriate configuration.
4. A migration Job that removes Alembic execution from backend Pod startup
   before horizontal scaling.
5. A complete offline and Argo CD render validation of the combined stack.

Only after those dependencies exist and the rendered production state is
reviewed should a later phase authorize the first manual sync.

## 24. Add the persistent Redis workload

Add Redis as the first dependency of the backend and future Celery workloads.
The current Compose deployment uses `redis:7-alpine`, AOF persistence, and a
named volume. Preserve that behavior with a single-replica StatefulSet,
`local-path` persistent storage, and the pinned official image
`redis:7.4.10-alpine`.

Keep the Argo CD Application in observation-only mode throughout this phase.
This section changes and renders desired state but does not create Redis, a
PVC, or the `arcana` namespace in K3s.

### 24.1 Record the Redis persistence and security decisions

Use these decisions for the initial single-node deployment:

- Use a StatefulSet rather than a Deployment so the Pod has a stable identity
  and stable volume claim.
- Use one replica. This is persistent but not highly available.
- Use K3s's `local-path` StorageClass with a 2 GiB `ReadWriteOnce` claim.
- Retain the PVC when the StatefulSet is deleted or scaled down.
- Enable AOF with `appendfsync everysec`, matching the persistence intent of
  Compose while limiting the normal durability window to approximately one
  second.
- Cap Redis dataset memory at 384 MiB inside a 768 MiB container limit and use
  `noeviction`; failed writes are safer than silently evicting Celery,
  idempotency, or dead-letter data.
- Expose Redis only through an internal headless ClusterIP Service, which also
  supplies the StatefulSet's stable network identity.
- Restrict port 6379 with a NetworkPolicy to Arcana-managed Pods in the same
  namespace.
- Run as the official image's non-root Redis identity, UID 999 and GID 1000,
  with all Linux capabilities dropped.

The PVC is not a backup. Before the first production sync, define a backup and
restore procedure for Redis data or explicitly accept that queued tasks,
result metadata, idempotency keys, and dead-letter entries may be lost with the
single node or disk.

### 24.2 Add the internal Redis Service

**Run on:** the administration workstation, from the root of the
`arcana-deployment` repository.

Create the Redis files:

```bash
touch apps/arcana/base/redis-service.yaml
touch apps/arcana/base/redis-statefulset.yaml
touch apps/arcana/base/redis-networkpolicy.yaml
```

Put this in `apps/arcana/base/redis-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: arcana-redis
spec:
  type: ClusterIP
  clusterIP: None
  selector:
    app.kubernetes.io/name: arcana-redis
  ports:
    - name: redis
      port: 6379
      targetPort: redis
      protocol: TCP
```

The headless Service name matches the existing backend ConfigMap URLs such as
`redis://arcana-redis:6379/0` and gives the StatefulSet its governing Service.
It does not create a NodePort, LoadBalancer, virtual cluster IP, or public host
listener. With one ready replica, DNS resolves directly to that Redis Pod.

### 24.3 Add the Redis StatefulSet and persistent claim

Put this in `apps/arcana/base/redis-statefulset.yaml`:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: arcana-redis
spec:
  serviceName: arcana-redis
  replicas: 1
  podManagementPolicy: OrderedReady
  updateStrategy:
    type: RollingUpdate
  persistentVolumeClaimRetentionPolicy:
    whenDeleted: Retain
    whenScaled: Retain

  selector:
    matchLabels:
      app.kubernetes.io/name: arcana-redis

  template:
    metadata:
      labels:
        app.kubernetes.io/name: arcana-redis
        app.kubernetes.io/component: cache
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 999
        runAsGroup: 1000
        fsGroup: 1000
        fsGroupChangePolicy: OnRootMismatch
        seccompProfile:
          type: RuntimeDefault

      containers:
        - name: redis
          image: redis:7.4.10-alpine
          imagePullPolicy: IfNotPresent
          command:
            - redis-server
          args:
            - --appendonly
            - "yes"
            - --appendfsync
            - everysec
            - --maxmemory
            - 384mb
            - --maxmemory-policy
            - noeviction

          ports:
            - name: redis
              containerPort: 6379
              protocol: TCP

          volumeMounts:
            - name: data
              mountPath: /data

          startupProbe:
            exec:
              command:
                - redis-cli
                - ping
            periodSeconds: 2
            timeoutSeconds: 1
            failureThreshold: 30

          readinessProbe:
            exec:
              command:
                - redis-cli
                - ping
            periodSeconds: 5
            timeoutSeconds: 1
            failureThreshold: 3

          livenessProbe:
            exec:
              command:
                - redis-cli
                - ping
            periodSeconds: 10
            timeoutSeconds: 1
            failureThreshold: 3

          resources:
            requests:
              cpu: 50m
              memory: 128Mi
            limits:
              cpu: 250m
              memory: 768Mi

          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
            readOnlyRootFilesystem: true

      terminationGracePeriodSeconds: 30

  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: local-path
        resources:
          requests:
            storage: 2Gi
```

The official Alpine image defines Redis as UID 999 and GID 1000. The Pod-level
identity and `fsGroup` make the local-path volume writable without starting the
container as root. The root filesystem remains read-only; Redis writes only to
`/data`.

The `Retain` claim policy prevents StatefulSet deletion or scale-down from
automatically deleting the PVC. Argo CD pruning must still be reviewed
carefully before any future storage change.

### 24.4 Restrict Redis network access

Put this in `apps/arcana/base/redis-networkpolicy.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: arcana-redis
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: arcana-redis
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app.kubernetes.io/part-of: arcana
      ports:
        - port: 6379
          protocol: TCP
```

A `podSelector` in a NetworkPolicy peer selects Pods only from the policy's
own namespace unless a `namespaceSelector` is also present. This permits
Arcana-managed backend and future Celery Pods while denying Redis connections
from other namespaces and unrelated Pods.

The current Redis URL has no password. The NetworkPolicy and ClusterIP limit
reachability for this single-tenant namespace, but they are not equivalent to
Redis authentication. Add Redis ACL credentials before expanding access to
other namespaces or tenants.

### 24.5 Register and validate the Redis resources

Add these entries to the existing `resources` list in
`apps/arcana/base/kustomization.yaml`:

```yaml
resources:
  - namespace.yaml
  - backend-configmap.yaml
  - backend-deployment.yaml
  - backend-service.yaml
  - redis-service.yaml
  - redis-statefulset.yaml
  - redis-networkpolicy.yaml
```

Do not remove the existing labels block.

Validate the three new manifests directly without decrypting or printing the
backend Secret:

```bash
kubeconform -strict -summary -exit-on-error \
  apps/arcana/base/redis-service.yaml \
  apps/arcana/base/redis-statefulset.yaml \
  apps/arcana/base/redis-networkpolicy.yaml

rg -n 'redis:7-alpine|redis:latest|tarot-redis|type: (NodePort|LoadBalancer)' \
  apps bootstrap || true

git diff --check
git status --short
```

Expected results:

- Kubeconform reports three valid resources.
- The stale-name, mutable-image, and externally exposed Service search
  produces no output.
- Git lists only the intended Redis and Kustomization changes.

Review the StatefulSet storage and resource values, then commit and push:

```bash
git add \
  apps/arcana/base/kustomization.yaml \
  apps/arcana/base/redis-service.yaml \
  apps/arcana/base/redis-statefulset.yaml \
  apps/arcana/base/redis-networkpolicy.yaml

git diff --cached --check
git commit -m "feat: add persistent Redis workload"
git push origin main
git status
```

### 24.6 Refresh Argo CD without synchronizing

**Run on:** the administration workstation, with the Section 19 SSH tunnel and
dedicated kubeconfig active.

Confirm the pushed revision, then request a render-only refresh:

```bash
git rev-parse HEAD
git rev-parse origin/main

kubectl annotate application -n argocd arcana-production \
  argocd.argoproj.io/refresh=hard \
  --overwrite
```

Verify status and non-secret resource inventory:

```bash
kubectl get application -n argocd arcana-production \
  -o custom-columns='NAME:.metadata.name,SYNC:.status.sync.status,HEALTH:.status.health.status,REVISION:.status.sync.revision'

kubectl get application -n argocd arcana-production \
  -o jsonpath='{range .status.conditions[*]}{.type}{": "}{.message}{"\n"}{end}'

kubectl get application -n argocd arcana-production \
  -o jsonpath='{range .status.resources[*]}{.kind}{"\t"}{.namespace}{"\t"}{.name}{"\t"}{.status}{"\n"}{end}' \
  | sort
```

Expected results after reconciliation:

- The revision matches the pushed Redis commit.
- Sync remains `OutOfSync` and health remains `Missing`.
- The conditions command produces no output.
- The inventory now contains eight desired resources: the previous five plus
  `Service/arcana-redis`, `StatefulSet/arcana-redis`, and
  `NetworkPolicy/arcana-redis`.
- No PVC appears yet because `volumeClaimTemplates` creates it only when the
  StatefulSet is synchronized.

Finally, prove that observation-only mode remains intact:

```bash
kubectl get application -n argocd arcana-production \
  -o jsonpath='{.spec.syncPolicy.automated.enabled}{"\n"}'
kubectl get namespace arcana --ignore-not-found -o name
```

Expected output is `false` followed by no namespace name. Do not sync the
Application.

### 24.7 Stop before adding the frontend and Celery workloads

**Action location:** no command is required in this subsection.

Redis desired state is now rendered but not deployed. Keep automated sync
disabled. The next phases must add the frontend, Celery worker, Celery Beat,
and migration Job before the first manual synchronization is considered.

## 25. Add the frontend workload

Add the Next.js frontend Deployment and internal Service. The current image
runs `npm start` on port 3000 and selects the public backend URL from the
browser hostname, with a build-time fallback. No frontend runtime Secret or
ConfigMap is required for this slice.

Keep the Argo CD Application in observation-only mode. Do not add an Ingress
or take over ports 80 and 443; Docker Traefik continues serving production.

### 25.1 Confirm the frontend image contract

The current frontend container has these characteristics:

- Image: `vanloc1808/tarot-frontend:<commit-sha>`
- Runtime: Next.js production server through `npm start`
- Container port: TCP 3000
- Probe path: `/`, which renders without requiring backend connectivity
- Container user: run explicitly as the Node image's non-root UID/GID 1000
- Writable runtime paths: `/app/.next/cache` and `/tmp` only

`NEXT_PUBLIC_API_URL` is compiled into the image during `next build`; changing
it only as a Pod environment variable does not rewrite browser JavaScript.
The current frontend also maps supported production hostnames to their backend
domains in code. Any future public-domain change therefore requires a new
frontend image, not only a Kubernetes ConfigMap edit.

### 25.2 Add the frontend Deployment

**Run on:** the administration workstation, from the root of the
`arcana-deployment` repository.

Create the frontend files:

```bash
touch apps/arcana/base/frontend-deployment.yaml
touch apps/arcana/base/frontend-service.yaml
```

Put this in `apps/arcana/base/frontend-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: arcana-frontend
spec:
  replicas: 1

  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1

  selector:
    matchLabels:
      app.kubernetes.io/name: arcana-frontend

  template:
    metadata:
      labels:
        app.kubernetes.io/name: arcana-frontend
        app.kubernetes.io/component: frontend
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        fsGroupChangePolicy: OnRootMismatch
        seccompProfile:
          type: RuntimeDefault

      containers:
        - name: frontend
          image: vanloc1808/tarot-frontend:latest
          imagePullPolicy: IfNotPresent

          env:
            - name: NODE_ENV
              value: production
            - name: HOSTNAME
              value: 0.0.0.0
            - name: PORT
              value: "3000"

          ports:
            - name: http
              containerPort: 3000
              protocol: TCP

          volumeMounts:
            - name: next-cache
              mountPath: /app/.next/cache
            - name: tmp
              mountPath: /tmp

          startupProbe:
            httpGet:
              path: /
              port: http
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 30

          readinessProbe:
            httpGet:
              path: /
              port: http
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3

          livenessProbe:
            httpGet:
              path: /
              port: http
            periodSeconds: 20
            timeoutSeconds: 3
            failureThreshold: 3

          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 768Mi

          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
            readOnlyRootFilesystem: true

      volumes:
        - name: next-cache
          emptyDir: {}
        - name: tmp
          emptyDir: {}

      terminationGracePeriodSeconds: 30
```

The root filesystem is read-only. Next.js receives disposable writable
`emptyDir` volumes for its runtime cache and temporary files; neither contains
authoritative application data and both may be lost when the Pod is replaced.

Start with one replica. The zero-unavailable rolling strategy may temporarily
run two frontend Pods during an update, so the resource budget must allow the
surge before replicas are increased.

### 25.3 Add the internal frontend Service

Put this in `apps/arcana/base/frontend-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: arcana-frontend
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/name: arcana-frontend
  ports:
    - name: http
      port: 3000
      targetPort: http
      protocol: TCP
```

The Service is reachable only inside Kubernetes at
`http://arcana-frontend:3000`. It does not create a NodePort, LoadBalancer,
Ingress, or host listener.

### 25.4 Register the frontend and pin its production image

Add the frontend files to the existing `resources` list in
`apps/arcana/base/kustomization.yaml`:

```yaml
resources:
  - namespace.yaml
  - backend-service.yaml
  - backend-configmap.yaml
  - backend-deployment.yaml
  - redis-service.yaml
  - redis-statefulset.yaml
  - redis-networkpolicy.yaml
  - frontend-deployment.yaml
  - frontend-service.yaml
```

Preserve the actual existing resource order if it differs; only the presence
of each entry is significant. Do not remove the labels block.

In `apps/arcana/overlays/production/kustomization.yaml`, add the frontend image
under the existing backend image and reuse the same real 40-character commit
SHA after confirming the frontend build for that SHA succeeded:

```yaml
images:
  - name: vanloc1808/tarot-backend
    newTag: EXISTING_REAL_COMMIT_SHA
  - name: vanloc1808/tarot-frontend
    newTag: THE_SAME_REAL_COMMIT_SHA
```

Do not copy the placeholder text literally. The GitHub Actions build job
publishes backend and frontend images with the ArcanaAI commit SHA. Production
must not use the mutable `latest` tag.

If Docker is available on the administration workstation, verify the exact
frontend tag without pulling it:

```bash
docker manifest inspect \
  vanloc1808/tarot-frontend:REPLACE_WITH_THE_REAL_COMMIT_SHA \
  >/dev/null
```

Replace the placeholder before running the command. A nonzero result means the
tag must not be committed or deployed.

### 25.5 Validate and commit the frontend slice

Validate the two new manifests directly:

```bash
kubeconform -strict -summary -exit-on-error \
  apps/arcana/base/frontend-deployment.yaml \
  apps/arcana/base/frontend-service.yaml

rg -n 'type: (NodePort|LoadBalancer)' \
  apps bootstrap || true

rg -n 'newTag: (latest|main)$' \
  apps/arcana/overlays/production/kustomization.yaml || true

rg -n 'vanloc1808/tarot-(backend|frontend)|newTag:' \
  apps/arcana/overlays/production/kustomization.yaml

git diff --check
git status --short
```

Expected results:

- Kubeconform reports two valid resources.
- The externally exposed Service and mutable production `newTag` searches
  produce no output.
- The production overlay lists both images with the same real SHA.
- Git lists only the intended frontend, base Kustomization, and production
  overlay changes.

The base Deployment intentionally contains the Kustomize match target
`vanloc1808/tarot-frontend:latest`. The production overlay must replace it; the
Argo CD rendered-image check in the next subsection proves that replacement.

Commit and push:

```bash
git add \
  apps/arcana/base/frontend-deployment.yaml \
  apps/arcana/base/frontend-service.yaml \
  apps/arcana/base/kustomization.yaml \
  apps/arcana/overlays/production/kustomization.yaml

git diff --cached --check
git commit -m "feat: add ArcanaAI frontend workload"
git push origin main
git status
```

### 25.6 Refresh Argo CD without synchronizing

**Run on:** the administration workstation, with the Section 19 SSH tunnel and
dedicated kubeconfig active.

```bash
git rev-parse HEAD
git rev-parse origin/main

kubectl annotate application -n argocd arcana-production \
  argocd.argoproj.io/refresh=hard \
  --overwrite
```

Verify status and non-secret resource inventory:

```bash
kubectl get application -n argocd arcana-production \
  -o custom-columns='NAME:.metadata.name,SYNC:.status.sync.status,HEALTH:.status.health.status,REVISION:.status.sync.revision'

kubectl get application -n argocd arcana-production \
  -o jsonpath='{range .status.conditions[*]}{.type}{": "}{.message}{"\n"}{end}'

kubectl get application -n argocd arcana-production \
  -o jsonpath='{range .status.resources[*]}{.kind}{"\t"}{.namespace}{"\t"}{.name}{"\t"}{.status}{"\n"}{end}' \
  | sort
```

Expected results after reconciliation:

- The revision matches the pushed frontend commit.
- Sync remains `OutOfSync` and health remains `Missing`.
- The conditions command produces no output.
- The inventory contains ten desired resources: the previous eight plus
  `Deployment/arcana-frontend` and `Service/arcana-frontend`.

Confirm the rendered image tag from Application status without printing
Secret content:

```bash
kubectl get application -n argocd arcana-production \
  -o jsonpath='{range .status.summary.images[*]}{.}{"\n"}{end}' \
  | sort
```

Expected output includes both SHA-tagged images and does not include either
frontend or backend `latest`.

Finally, prove observation-only mode remains intact:

```bash
kubectl get application -n argocd arcana-production \
  -o jsonpath='{.spec.syncPolicy.automated.enabled}{"\n"}'
kubectl get namespace arcana --ignore-not-found -o name
```

Expected output is `false` followed by no namespace name. Do not sync the
Application.

### 25.7 Stop before adding Celery and database migrations

**Action location:** no command is required in this subsection.

The frontend desired state is now rendered but not deployed or publicly
exposed. Keep automated sync disabled. The next phases must add the Celery
worker, Celery Beat, and dedicated migration Job before the first manual sync.

## 26. Add Celery worker and Beat workloads

Add the asynchronous worker and periodic scheduler as a separate render-only
slice. Both workloads reuse the SHA-pinned backend image and the existing
backend ConfigMap and encrypted Secret. They connect to the internal
`arcana-redis` Service and are not exposed publicly.

Keep automated synchronization disabled throughout this section. In
particular, do not allow either Celery workload to inherit the backend image's
default `/app/start.sh`: that script runs `alembic upgrade head` before starting
Uvicorn. Celery must use an explicit command, and database migration must remain
the responsibility of the dedicated Job added in the next phase.

### 26.1 Prepare the personal MacBook administration workstation

**Run on:** the personal MacBook. Complete this subsection before continuing
with any Celery commands.

The Argo CD repository key created in Section 21 is a read-only machine
credential stored in Kubernetes. Do not copy its private key to the MacBook or
change it to permit writes. Create a second, repository-specific SSH key for
the personal MacBook. This workstation key needs write access because the
remaining guide edits and pushes the deployment repository.

Install the local command-line prerequisites if they are not already present:

```bash
brew install age sops kubectl kubeconform ripgrep

age --version
sops --version
kubectl version --client
kubeconform -v
rg --version
docker version
```

Docker Desktop must be installed and running for the image-contract checks.
Do not continue past a missing command; install it from its official source
first.

Create a dedicated SSH identity, refusing to replace an existing one:

```bash
MACBOOK_DEPLOY_KEY="$HOME/.ssh/arcana-deployment-macbook"
mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"

if test -e "$MACBOOK_DEPLOY_KEY" || test -e "$MACBOOK_DEPLOY_KEY.pub"; then
  echo "Refusing to overwrite the existing MacBook deployment key" >&2
  exit 1
fi

ssh-keygen -t ed25519 \
  -C 'arcana-deployment personal MacBook' \
  -f "$MACBOOK_DEPLOY_KEY"

chmod 600 "$MACBOOK_DEPLOY_KEY"
chmod 644 "$MACBOOK_DEPLOY_KEY.pub"
pbcopy < "$MACBOOK_DEPLOY_KEY.pub"
```

Use a passphrase when prompted and store it in the macOS Keychain. The final
command copies only the public key.

In GitHub, open `vanloc1808/arcana-deployment` and go to **Settings > Deploy
keys > Add deploy key**. Use a descriptive title such as `Personal MacBook
deployment writer`, paste the copied public key, deliberately select **Allow
write access**, and add the key. Write access is appropriate only for this
workstation identity because the guide commits to this repository. Leave the
separate Argo CD deploy key read-only.

Edit `~/.ssh/config` and add this repository-specific alias without removing
existing entries:

```sshconfig
Host github-arcana-deployment-macbook
  HostName github.com
  User git
  IdentityFile ~/.ssh/arcana-deployment-macbook
  IdentitiesOnly yes
  AddKeysToAgent yes
  UseKeychain yes
```

Protect the SSH configuration and load the passphrase-backed key:

```bash
chmod 600 "$HOME/.ssh/config"
ssh-add --apple-use-keychain "$HOME/.ssh/arcana-deployment-macbook"
ssh -T git@github-arcana-deployment-macbook
```

On the first connection, compare GitHub's displayed host-key fingerprint with
the fingerprint published in GitHub's official documentation before accepting
it. GitHub normally prints a successful-authentication message while returning
a nonzero status because it does not provide shell access.

Clone the deployment repository if it is not present:

```bash
git clone \
  git@github-arcana-deployment-macbook:vanloc1808/arcana-deployment.git
cd arcana-deployment
git remote -v
git fetch origin main
git rev-parse HEAD
git rev-parse origin/main
```

If it is already cloned, do not clone another copy. From its root, inspect the
current remote before changing anything:

```bash
git remote -v
```

If and only if `origin` points at the same `vanloc1808/arcana-deployment`
repository, select the dedicated MacBook alias and update safely:

```bash
git remote set-url origin \
  git@github-arcana-deployment-macbook:vanloc1808/arcana-deployment.git
git pull --ff-only origin main
```

The existing SOPS Age identity is also required. Securely transfer the
original `keys.txt` to the MacBook outside Git, or use the existing MacBook
copy if it is already there. Do not generate a replacement: existing secrets
are encrypted to the original recipient.

After the identity is present, verify it without printing the private key:

```bash
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"
chmod 700 "$HOME/.config" "$HOME/.config/sops" "$HOME/.config/sops/age"
chmod 600 "$SOPS_AGE_KEY_FILE"
test "$(stat -f '%Lp' "$SOPS_AGE_KEY_FILE")" = 600

AGE_RECIPIENT="$(age-keygen -y "$SOPS_AGE_KEY_FILE")"
printf 'Configured recipient: %s\n' "$AGE_RECIPIENT"
rg -nF "age: $AGE_RECIPIENT" .sops.yaml

sops filestatus \
  apps/arcana/overlays/production/backend-secret.sops.yaml
```

The recipient must match `.sops.yaml`, and `filestatus` must report
`{"encrypted":true}`. The recipient is public; never print, paste, or commit
the private identity contained in `keys.txt`.

Finally, configure MacBook access to the VPS and cluster:

1. Confirm `ssh vps` reaches the intended VPS using the personal MacBook's
   existing SSH configuration. If it does not, add the correct `Host vps`
   entry and a separately authorized VPS SSH identity; do not copy the Argo CD
   repository key for this purpose.
2. Repeat Sections 19.1 through 19.3 on this MacBook. Keep
   `ssh -N -L 16443:127.0.0.1:6443 vps` running in a dedicated terminal and
   create a new local `~/.kube/arcana-k3s.yaml` with mode `0600`.
3. Verify that `kubectl get nodes` succeeds through the tunnel and that the
   dedicated kubeconfig points to `https://127.0.0.1:16443`.

Do not copy the company laptop's kubeconfig through chat or Git. Generating a
fresh local copy directly from the VPS avoids moving the cluster-admin
credential through an additional workstation.

### 26.2 Confirm the Celery image contract and staging capacity

**Run on:** the administration workstation, from the root of the
`arcana-deployment` repository. Keep the Section 19 SSH tunnel running in its
other terminal.

First capture the immutable production image tag and prove that it is a real
40-character lowercase hexadecimal Git SHA:

```bash
BACKEND_IMAGE_TAG="$(
  awk '
    $1 == "-" && $2 == "name:" && $3 == "vanloc1808/tarot-backend" { in_backend=1; next }
    in_backend && $1 == "newTag:" { print $2; exit }
  ' apps/arcana/overlays/production/kustomization.yaml
)"

printf 'Backend image tag: %s\n' "$BACKEND_IMAGE_TAG"
printf '%s\n' "$BACKEND_IMAGE_TAG" \
  | rg -x '[0-9a-f]{40}' >/dev/null
```

Inspect the image without running it or printing environment variables:

```bash
docker manifest inspect \
  "vanloc1808/tarot-backend:$BACKEND_IMAGE_TAG" \
  >/dev/null &&
echo 'Backend image exists'

docker image inspect \
  "vanloc1808/tarot-backend:$BACKEND_IMAGE_TAG" \
  --format 'entrypoint={{json .Config.Entrypoint}} cmd={{json .Config.Cmd}}'
```

If the second command reports that the image is absent locally, inspect it in
an ephemeral container without starting its default command:

```bash
docker run --rm \
  --platform linux/amd64 \
  --entrypoint /bin/sh \
  "vanloc1808/tarot-backend:$BACKEND_IMAGE_TAG" \
  -c 'test -x /app/.venv/bin/celery && test -r /app/celery_app.py && printf "Celery runtime exists\n"'
```

`--platform linux/amd64` is required when this check runs on an Apple Silicon
Mac because the current production image is AMD64-only. The production VPS is
x86-64, so this does not prevent the VPS from running the image. The expected
image default is `/app/start.sh`; this is evidence that the Kubernetes Celery
manifests must override it. The final command must print `Celery runtime
exists`. Do not print the image configuration as JSON because future images
could contain build metadata that is not needed for this check.

Check current cluster headroom before adding two more desired Pods:

```bash
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"

kubectl top node myvps
kubectl describe node myvps \
  | sed -n '/Allocated resources:/,/Events:/p'

ssh vps 'df -h /; sudo du -sh /var/lib/rancher'
```

Stop and investigate if the root filesystem has less than 10 GiB available,
the node reports memory pressure, or existing system/Argo CD Pods are not
healthy. These checks do not create or modify Kubernetes resources.

### 26.3 Stop for review

**Action location:** no command is required in this subsection.

Retain the output from Section 26.2 for review before creating the Celery
manifests. The next subsection will define one worker consuming the `email`,
`notifications`, `celery`, and `dead_letter` queues, one Beat scheduler, their
internal metrics Services, disposable Prometheus multiprocess directories,
and persistent Beat schedule storage. Nothing should be synchronized yet.

The review found that a separate transient Docker container was temporarily
consuming most of the VPS CPU. Disk remained above the 10 GiB floor, memory
remained healthy, and every K3s and Argo CD Pod remained healthy. Manifest
authoring may continue because the Argo CD Application is observation-only,
but no workload may be synchronized until the transient load ends and node
capacity is checked again.

### 26.4 Define the Celery worker

**Run on:** the administration workstation, from the root of the
`arcana-deployment` repository.

Create `apps/arcana/base/celery-worker-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: arcana-celery-worker
spec:
  replicas: 1

  strategy:
    type: Recreate

  selector:
    matchLabels:
      app.kubernetes.io/name: arcana-celery-worker

  template:
    metadata:
      labels:
        app.kubernetes.io/name: arcana-celery-worker
        app.kubernetes.io/component: celery-worker

    spec:
      initContainers:
        - name: wait-for-redis
          image: redis:7.4.10-alpine
          imagePullPolicy: IfNotPresent
          command:
            - /bin/sh
            - -ec
          args:
            - |
              until redis-cli -h arcana-redis ping | grep -q PONG; do
                echo "Waiting for Redis"
                sleep 2
              done
          resources:
            requests:
              cpu: 10m
              memory: 16Mi
            limits:
              cpu: 50m
              memory: 64Mi
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
            seccompProfile:
              type: RuntimeDefault

      containers:
        - name: worker
          image: vanloc1808/tarot-backend:latest
          imagePullPolicy: IfNotPresent
          workingDir: /app

          command:
            - /app/.venv/bin/celery
          args:
            - -A
            - celery_app
            - worker
            - --loglevel=info
            - --queues=email,notifications,celery,dead_letter
            - --concurrency=1

          envFrom:
            - configMapRef:
                name: arcana-backend-config
            - secretRef:
                name: arcana-backend-secrets

          env:
            - name: PYTHONPATH
              value: /app
            - name: PROMETHEUS_MULTIPROC_DIR
              value: /tmp/prometheus-multiproc
            - name: CELERY_METRICS_PORT
              value: "8001"

          ports:
            - name: metrics
              containerPort: 8001
              protocol: TCP

          volumeMounts:
            - name: prometheus-multiproc
              mountPath: /tmp/prometheus-multiproc

          startupProbe:
            tcpSocket:
              port: metrics
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 30

          readinessProbe:
            tcpSocket:
              port: metrics
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 3

          livenessProbe:
            tcpSocket:
              port: metrics
            periodSeconds: 20
            timeoutSeconds: 2
            failureThreshold: 3

          resources:
            requests:
              cpu: 100m
              memory: 384Mi
            limits:
              cpu: 500m
              memory: 768Mi

          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
            seccompProfile:
              type: RuntimeDefault

      volumes:
        - name: prometheus-multiproc
          emptyDir: {}

      terminationGracePeriodSeconds: 60
```

The direct command bypasses the backend image's `/app/start.sh`, so the worker
cannot run Alembic or start Uvicorn. The disposable `emptyDir` gives each Pod a
fresh Prometheus multiprocess directory. Concurrency starts at one to limit
CPU use on the shared six-core VPS and may be tuned later from production
measurements.

Validate only the new file without contacting the cluster:

```bash
kubeconform \
  -strict \
  -summary \
  -exit-on-error \
  apps/arcana/base/celery-worker-deployment.yaml

git diff --check
```

Do not add this file to `kustomization.yaml`, commit it, push it, or synchronize
the Argo CD Application yet. Retain the validation output for review before
defining its internal metrics Service.

### 26.5 Define the Celery worker metrics Service

**Run on:** the administration workstation, from the root of the
`arcana-deployment` repository.

Create `apps/arcana/base/celery-worker-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: arcana-celery-worker-metrics
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/name: arcana-celery-worker
  ports:
    - name: metrics
      port: 8001
      targetPort: metrics
      protocol: TCP
```

This Service is internal to Kubernetes. It does not create a public port,
Ingress, NodePort, or load balancer. It gives future in-cluster monitoring a
stable endpoint while leaving the current Docker monitoring stack unchanged.

Validate only the new file without contacting the cluster:

```bash
kubeconform \
  -strict \
  -summary \
  -exit-on-error \
  apps/arcana/base/celery-worker-service.yaml

git diff --check
```

Do not add either Celery worker file to `kustomization.yaml`, commit, push, or
synchronize yet. Retain the validation output before defining Celery Beat and
its persistent schedule storage.

### 26.6 Define persistent Celery Beat schedule storage

**Run on:** the administration workstation, from the root of the
`arcana-deployment` repository.

Create `apps/arcana/base/celery-beat-pvc.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: arcana-celery-beat-data
  annotations:
    argocd.argoproj.io/sync-options: Prune=false
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 256Mi
```

The claim stores Celery Beat's local schedule database under K3s's
`local-path` StorageClass. The `Prune=false` annotation makes deletion an
explicit administrative decision instead of allowing an Argo CD prune to
remove scheduler state automatically. It does not constitute a backup.

Validate only the new file without contacting the cluster:

```bash
kubeconform \
  -strict \
  -summary \
  -exit-on-error \
  apps/arcana/base/celery-beat-pvc.yaml

git diff --check
```

Do not add any Celery resource to `kustomization.yaml`, commit, push, or
synchronize yet. Retain the validation output before defining the single Beat
scheduler Pod.

### 26.7 Define the single Celery Beat scheduler

**Run on:** the administration workstation, from the root of the
`arcana-deployment` repository.

Create `apps/arcana/base/celery-beat-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: arcana-celery-beat
spec:
  replicas: 1

  strategy:
    type: Recreate

  selector:
    matchLabels:
      app.kubernetes.io/name: arcana-celery-beat

  template:
    metadata:
      labels:
        app.kubernetes.io/name: arcana-celery-beat
        app.kubernetes.io/component: celery-beat

    spec:
      initContainers:
        - name: wait-for-redis
          image: redis:7.4.10-alpine
          imagePullPolicy: IfNotPresent
          command:
            - /bin/sh
            - -ec
          args:
            - |
              until redis-cli -h arcana-redis ping | grep -q PONG; do
                echo "Waiting for Redis"
                sleep 2
              done
          resources:
            requests:
              cpu: 10m
              memory: 16Mi
            limits:
              cpu: 50m
              memory: 64Mi
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
            seccompProfile:
              type: RuntimeDefault

      containers:
        - name: beat
          image: vanloc1808/tarot-backend:latest
          imagePullPolicy: IfNotPresent
          workingDir: /app

          command:
            - /app/.venv/bin/celery
          args:
            - -A
            - celery_app
            - beat
            - --loglevel=info
            - --schedule=/var/lib/celery/celerybeat-schedule

          envFrom:
            - configMapRef:
                name: arcana-backend-config
            - secretRef:
                name: arcana-backend-secrets

          env:
            - name: PYTHONPATH
              value: /app
            - name: PROMETHEUS_MULTIPROC_DIR
              value: /tmp/prometheus-multiproc
            - name: CELERY_METRICS_PORT
              value: "8001"

          ports:
            - name: metrics
              containerPort: 8001
              protocol: TCP

          volumeMounts:
            - name: schedule
              mountPath: /var/lib/celery
            - name: prometheus-multiproc
              mountPath: /tmp/prometheus-multiproc

          startupProbe:
            tcpSocket:
              port: metrics
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 30

          readinessProbe:
            tcpSocket:
              port: metrics
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 3

          livenessProbe:
            tcpSocket:
              port: metrics
            periodSeconds: 20
            timeoutSeconds: 2
            failureThreshold: 3

          resources:
            requests:
              cpu: 50m
              memory: 128Mi
            limits:
              cpu: 250m
              memory: 384Mi

          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
            seccompProfile:
              type: RuntimeDefault

      volumes:
        - name: schedule
          persistentVolumeClaim:
            claimName: arcana-celery-beat-data
        - name: prometheus-multiproc
          emptyDir: {}

      terminationGracePeriodSeconds: 60
```

`Recreate` and `replicas: 1` prevent two Beat schedulers from intentionally
overlapping during an update. The PVC is mounted as a directory and the
schedule database is stored as a file inside it. The direct command bypasses
`/app/start.sh`, so Beat cannot run Alembic or start Uvicorn.

Validate only the new file without contacting the cluster:

```bash
kubeconform \
  -strict \
  -summary \
  -exit-on-error \
  apps/arcana/base/celery-beat-deployment.yaml

git diff --check
```

Do not add any Celery resource to `kustomization.yaml`, commit, push, or
synchronize yet. Retain the validation output before defining Beat's internal
metrics Service.

### 26.8 Define the Celery Beat metrics Service

**Run on:** the administration workstation, from the root of the
`arcana-deployment` repository.

Create `apps/arcana/base/celery-beat-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: arcana-celery-beat-metrics
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/name: arcana-celery-beat
  ports:
    - name: metrics
      port: 8001
      targetPort: metrics
      protocol: TCP
```

This Service is internal to Kubernetes. It creates no public port, Ingress,
NodePort, or load balancer and does not change the existing Docker monitoring
stack.

Validate only the new file without contacting the cluster:

```bash
kubeconform \
  -strict \
  -summary \
  -exit-on-error \
  apps/arcana/base/celery-beat-service.yaml

git diff --check
```

Do not add any Celery resource to `kustomization.yaml`, commit, push, or
synchronize yet. Retain the validation output before registering and rendering
the complete Celery slice.

### 26.9 Register and render the complete Celery slice

**Run on:** the administration workstation, from the root of the
`arcana-deployment` repository.

Update `apps/arcana/base/kustomization.yaml` so its `resources` list is:

```yaml
resources:
  - namespace.yaml
  - backend-service.yaml
  - backend-configmap.yaml
  - backend-deployment.yaml
  - redis-service.yaml
  - redis-statefulset.yaml
  - redis-networkpolicy.yaml
  - frontend-deployment.yaml
  - frontend-service.yaml
  - celery-worker-deployment.yaml
  - celery-worker-service.yaml
  - celery-beat-pvc.yaml
  - celery-beat-deployment.yaml
  - celery-beat-service.yaml
```

Do not change the existing `apiVersion`, `kind`, or `labels` fields.

Render and validate the complete base without invoking the production KSOPS
generator:

```bash
kubectl kustomize apps/arcana/base \
  | kubeconform -strict -summary -exit-on-error
```

Expected summary:

```text
Summary: 14 resources found parsing stdin - Valid: 14, Invalid: 0, Errors: 0, Skipped: 0
```

Inspect only non-secret relationships and exposure:

```bash
kubectl kustomize apps/arcana/base \
  | rg '^(kind:|  name: arcana-|  type: (NodePort|LoadBalancer)|  image:|      claimName:)'

rg -n 'type: (NodePort|LoadBalancer)' apps bootstrap || true
rg -n 'tarot-redis|redis:7-alpine|redis:latest' apps bootstrap || true

git diff --check
git status --short
```

Expected results:

- The base contains 14 valid resources.
- The two Celery Deployments use the backend image match target
  `vanloc1808/tarot-backend:latest`; the production overlay will replace all
  occurrences with its immutable SHA.
- Both Celery Services are `ClusterIP`; the external-Service search produces
  no output.
- Beat references the `arcana-celery-beat-data` claim.
- The stale Redis image/name search produces no output.
- Git lists the five intended Celery files and the base Kustomization change.

Do not commit, push, or synchronize yet. Retain the render, search, and status
output for review before staging the slice.

### 26.10 Commit and push the Celery desired state

**Run on:** the administration workstation, from the root of the
`arcana-deployment` repository.

Stage only the reviewed Celery slice:

```bash
git add \
  apps/arcana/base/kustomization.yaml \
  apps/arcana/base/celery-worker-deployment.yaml \
  apps/arcana/base/celery-worker-service.yaml \
  apps/arcana/base/celery-beat-pvc.yaml \
  apps/arcana/base/celery-beat-deployment.yaml \
  apps/arcana/base/celery-beat-service.yaml

git diff --cached --check
git diff --cached --stat
git status --short
```

Expected staged scope:

```text
apps/arcana/base/celery-beat-deployment.yaml
apps/arcana/base/celery-beat-pvc.yaml
apps/arcana/base/celery-beat-service.yaml
apps/arcana/base/celery-worker-deployment.yaml
apps/arcana/base/celery-worker-service.yaml
apps/arcana/base/kustomization.yaml
```

Do not proceed if any other file is staged. When the scope is exact, commit
and push:

```bash
git commit -m "feat: add Celery worker and Beat workloads"
git push origin main
git status
```

The final status should report a clean working tree synchronized with
`origin/main`. Pushing changes only Git and Argo CD's desired-state rendering;
automated synchronization remains disabled, so no Arcana resource should be
created in K3s.

Do not manually sync the Application. Retain the commit SHA and push output
for the render-only Argo CD verification.

### 26.11 Refresh Argo CD without synchronizing

**Run on:** the administration workstation, with the Section 19 SSH tunnel
running and the dedicated kubeconfig active.

Confirm the deployment repository is at the pushed revision:

```bash
git rev-parse HEAD
git rev-parse origin/main
```

Both commands must print the same Celery commit SHA. Then request a render-only
hard refresh:

```bash
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"

kubectl annotate application -n argocd arcana-production \
  argocd.argoproj.io/refresh=hard \
  --overwrite
```

This annotation asks Argo CD to fetch and render the new Git revision. It does
not synchronize the Application.

Verify status, conditions, and the non-secret desired-resource inventory:

```bash
kubectl get application -n argocd arcana-production \
  -o custom-columns='NAME:.metadata.name,SYNC:.status.sync.status,HEALTH:.status.health.status,REVISION:.status.sync.revision'

kubectl get application -n argocd arcana-production \
  -o jsonpath='{range .status.conditions[*]}{.type}{": "}{.message}{"\n"}{end}'

kubectl get application -n argocd arcana-production \
  -o jsonpath='{range .status.resources[*]}{.kind}{"\t"}{.namespace}{"\t"}{.name}{"\t"}{.status}{"\n"}{end}' \
  | sort
```

Expected results after reconciliation:

- The revision matches the pushed Celery commit.
- Sync remains `OutOfSync` and health remains `Missing`.
- The conditions command produces no output.
- The inventory contains 15 desired resources: the previous ten plus the
  Celery worker Deployment and Service, Beat PVC, Beat Deployment, and Beat
  Service.
- Every desired resource remains `OutOfSync` or `Missing`; nothing is live.

The image summary may be empty while every desired resource is still missing
because the Application has never synchronized. If it is populated, inspect it
without printing Secret content:

```bash
kubectl get application -n argocd arcana-production \
  -o jsonpath='{range .status.summary.images[*]}{.}{"\n"}{end}' \
  | sort
```

An empty result is acceptable at this pre-sync stage. Prove production image
replacement offline with a temporary copy of the base and production overlay
that deliberately omits the KSOPS generator. This temporary render therefore
cannot decrypt or print the backend Secret:

```bash
RENDER_TMP="$(mktemp -d)" || exit 1
test -n "$RENDER_TMP"

mkdir -p "$RENDER_TMP/apps/arcana/overlays/production"
cp -R apps/arcana/base "$RENDER_TMP/apps/arcana/base"

sed '/^generators:/,$d' \
  apps/arcana/overlays/production/kustomization.yaml \
  >"$RENDER_TMP/apps/arcana/overlays/production/kustomization.yaml"

kustomize build "$RENDER_TMP/apps/arcana/overlays/production" \
  | rg 'image:' \
  | sort
```

Expected output contains three SHA-tagged backend references (backend, worker,
and Beat), one SHA-tagged frontend reference, and three
`redis:7.4.10-alpine` references (Redis plus two init containers). No image may
end in `:latest`.

The temporary directory contains no decrypted Secret. Record its printed path
with `printf '%s\n' "$RENDER_TMP"` if it will be cleaned up later; do not use
an unverified path in a recursive deletion command.

Finally, prove observation-only mode and the absence of live Arcana resources:

```bash
kubectl get application -n argocd arcana-production \
  -o jsonpath='{.spec.syncPolicy.automated.enabled}{"\n"}'

kubectl get namespace arcana --ignore-not-found -o name
```

Expected output is `false` followed by no namespace name. Do not sync the
Application. Retain all output for review before adding the dedicated database
migration Job.

### 26.12 End-of-session checkpoint

The Celery desired state is complete and pushed in the deployment repository.
Argo CD successfully rendered commit `100674f883cd3144a7f622e21ee91e06dc6cc5f7`
as 15 desired resources with no conditions. The offline non-secret production
render proved that all three backend workloads and the frontend use the pinned
commit-SHA image, all three Redis references use `redis:7.4.10-alpine`, and no
rendered image uses `:latest`.

Automated synchronization remains disabled, the `arcana` namespace does not
exist, and no Arcana resource has been created in K3s.

A Docker workload owned by another VPS user, `incrview-backend`, was still
transiently consuming most of the six-core server. Do not stop, restart, limit,
or reconfigure that container. Before the first Arcana synchronization, wait
for its owner to finish it and then rerun:

```bash
ssh vps \
  "docker ps --filter name=incrview-backend --format 'table {{.Names}}\t{{.Status}}'"

for sample in 1 2 3; do
  date
  kubectl top node myvps
  sleep 10
done

ssh vps 'uptime; df -h /; sudo du -sh /var/lib/rancher'
```

The next manifest phase is a dedicated database migration Job so application
Pods do not all run Alembic through `/app/start.sh`. Authoring may proceed
while the external workload is active, but no manual or automated Argo CD sync
may occur until capacity is healthy and the migration ordering and rollback
behavior have been reviewed.

## 27. Add a dedicated database migration Job

Move schema migration ownership out of the backend container startup path
before the first Arcana synchronization. The migration must run exactly once
for a selected application image revision, complete successfully before any
database-using Kubernetes workload starts, and leave the existing Docker
production stack untouched during staging.

Adding a Job alone is insufficient: the current backend image defaults to
`/app/start.sh`, which also runs `alembic upgrade head`. A later subsection
will therefore give Argo CD explicit migration ordering and change the
Kubernetes backend command to start Uvicorn directly. Celery already overrides
the image command and cannot invoke `/app/start.sh`.

Keep automated synchronization disabled. Do not create the `arcana` namespace,
run Alembic against production, scale either Celery scheduler, or stop any
Docker container during this section.

### 27.1 Reconcile inputs and verify the migration contract

**Run on: current administration workstation (this Ubuntu machine).**

Start with clean, current checkouts. Replace the two example paths with the
actual repository paths on this Ubuntu machine:

```bash
ARCANA_AI_REPO=/absolute/path/to/arcana-ai
ARCANA_DEPLOYMENT_REPO=/absolute/path/to/arcana-deployment

test -d "$ARCANA_AI_REPO/.git"
test -d "$ARCANA_DEPLOYMENT_REPO/.git"

git -C "$ARCANA_AI_REPO" status --short
git -C "$ARCANA_DEPLOYMENT_REPO" status --short
```

Both status commands must produce no output. Do not pull across uncommitted or
untracked work. When both repositories are clean:

```bash
git -C "$ARCANA_AI_REPO" pull --ff-only origin main
git -C "$ARCANA_DEPLOYMENT_REPO" pull --ff-only origin main

git -C "$ARCANA_AI_REPO" rev-parse HEAD
git -C "$ARCANA_AI_REPO" rev-parse origin/main
git -C "$ARCANA_DEPLOYMENT_REPO" rev-parse HEAD
git -C "$ARCANA_DEPLOYMENT_REPO" rev-parse origin/main
```

Each repository's `HEAD` must equal its own `origin/main`. The two repositories
are independent and are not expected to have the same commit.

Resolve the backend image tag from GitOps desired state and require an
immutable 40-character Git SHA:

```bash
cd "$ARCANA_DEPLOYMENT_REPO"

BACKEND_IMAGE_TAG="$(
  awk '
    $1 == "-" && $2 == "name:" && $3 == "vanloc1808/tarot-backend" { in_backend=1; next }
    in_backend && $1 == "newTag:" { print $2; exit }
  ' apps/arcana/overlays/production/kustomization.yaml
)"

printf 'Backend image tag: %s\n' "$BACKEND_IMAGE_TAG"
printf '%s\n' "$BACKEND_IMAGE_TAG" \
  | rg -x '[0-9a-f]{40}' >/dev/null

docker manifest inspect \
  "vanloc1808/tarot-backend:$BACKEND_IMAGE_TAG" \
  >/dev/null &&
echo 'Pinned backend image exists'
```

Inspect the migration and direct application runtimes inside that exact image
without supplying production environment variables. On Apple Silicon,
`--platform linux/amd64` matches the x86-64 VPS image:

```bash
docker run --rm \
  --platform linux/amd64 \
  --entrypoint /bin/sh \
  "vanloc1808/tarot-backend:$BACKEND_IMAGE_TAG" \
  -ec '
    test -x /app/.venv/bin/alembic
    test -x /app/.venv/bin/uvicorn
    test -r /app/alembic.ini
    test -d /app/migrations
    printf "Migration and Uvicorn runtimes exist\n"
    cd /app
    /app/.venv/bin/alembic heads
  '
```

The command must print `Migration and Uvicorn runtimes exist` followed by the
Alembic head revision or revisions. Multiple heads are not automatically an
error, but they must be explained by an intentional merge revision before a
production migration is authorized. This command does not connect to the
database because `alembic heads` only inspects packaged migration files.

Confirm that the encrypted Secret contains the database URL key without
printing its value or writing plaintext to disk:

```bash
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"
test -r "$SOPS_AGE_KEY_FILE"
test "$(stat -c '%a' "$SOPS_AGE_KEY_FILE")" = 600

sops filestatus \
  apps/arcana/overlays/production/backend-secret.sops.yaml

sops --decrypt \
  --extract '["stringData"]["SQLALCHEMY_DATABASE_URL"]' \
  apps/arcana/overlays/production/backend-secret.sops.yaml \
  >/dev/null &&
echo 'Encrypted database URL is present and decryptable'
```

Expected results are `{"encrypted":true}` and the final confirmation line.
Never remove the redirection, use shell tracing, print the decrypted Secret,
or place its value in a command-line argument.

Finally, reconfirm that staging remains observation-only:

```bash
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"

kubectl get application -n argocd arcana-production \
  -o jsonpath='automated={.spec.syncPolicy.automated}{"\n"}enabled={.spec.syncPolicy.automated.enabled}{"\n"}'

ARCANA_NAMESPACE="$(
  kubectl get namespace arcana --ignore-not-found -o name
)" || {
  echo 'STOP: unable to verify whether the arcana namespace exists' >&2
  exit 1
}

if test -n "$ARCANA_NAMESPACE"; then
  echo 'STOP: arcana namespace already exists' >&2
  exit 1
else
  echo 'Confirmed: arcana namespace has not been created'
fi
```

Automated synchronization must explicitly show `enabled:false`, and the
namespace must remain absent. Stop on any unexpected result. Retain all output
for review before choosing the Job lifecycle, Argo CD sync wave, backend
command override, and first-sync replica gates.

### 27.2 Stop for migration-design review

**Run on: no machine; this is a review checkpoint.**

Do not author or apply the Job yet. The next subsection must settle four
linked decisions together:

1. The migration Job's retry, timeout, and cleanup behavior.
2. Argo CD ordering that blocks application workloads until migration succeeds.
3. A direct Uvicorn command that prevents the backend Pod from rerunning
   Alembic.
4. Production-overlay replica gates that prevent Kubernetes Celery Beat from
   overlapping with the still-running Docker Celery Beat during staging.

### 27.3 Adopt a two-gate migration and activation design

**Run on: no machine; this subsection records the reviewed design.**

Do not use an Argo CD `PreSync` hook for the first-ever synchronization. The
migration needs `arcana-backend-config` and the KSOPS-generated
`arcana-backend-secrets`, but those resources do not exist until Argo CD first
synchronizes the namespace and baseline desired state. Hook phase ordering
would otherwise allow the migration to start before its dependencies exist.

Use two explicit gates instead:

#### Gate A: inert Kubernetes baseline

Before the first manual synchronization:

- Override the Kubernetes backend command to execute Uvicorn directly, never
  `/app/start.sh`.
- Set the production overlay replica count to zero for `arcana-backend`,
  `arcana-frontend`, `arcana-celery-worker`, and `arcana-celery-beat`.
- Author and validate the migration Job file, but do not register it in the
  base Kustomization yet.
- Leave Redis at one replica so its retained storage and internal Service can
  be verified independently.
- Keep Argo CD automated synchronization disabled.

The first carefully reviewed manual sync may then create the namespace,
ConfigMap, encrypted Secret, Services, retained claims, Redis, and zero-replica
Deployment objects. It must not run Alembic, serve Kubernetes application
traffic, consume queues, or start a second Beat scheduler.

#### Gate B: explicitly authorized migration

Only after Gate A is healthy, a current database backup or provider recovery
point is confirmed, and the migration set has been reviewed:

- Register the migration Job in Kustomize in a dedicated commit.
- Run it as an Argo CD `Sync` hook at sync wave `-1`.
- Keep every application Deployment at zero replicas during that sync.
- Use `BeforeHookCreation,HookSucceeded` cleanup policy. A successful Job is
  removed; a failed Job remains available for diagnosis and is deleted only
  before an explicitly requested retry.
- Set `backoffLimit: 1` and `activeDeadlineSeconds: 900`. A migration failure
  blocks later waves and requires diagnosis; it must not retry indefinitely.

The Job command will be `/app/.venv/bin/alembic upgrade head`, with
`workingDir: /app`, the SHA-pinned backend image, and the same ConfigMap and
Secret references as the backend. It will not contain credentials, invoke a
shell, start Uvicorn, or depend on Redis.

#### Activation after migration

Scaling is a separate post-migration operation:

1. Scale the Kubernetes backend, frontend, and worker only after the migration
   Job has succeeded and compatibility with the still-running Docker version
   has been confirmed.
2. Keep Kubernetes Beat at zero while Docker Beat runs.
3. At the scheduler cutover, stop Docker Beat through the existing Compose
   project, verify it is stopped, and only then scale Kubernetes Beat to one.
4. Public ingress migration remains a later phase. Docker Traefik continues to
   own ports 80 and 443 throughout these gates.

Never activate both Beat schedulers simultaneously. Do not infer migration
rollback from Argo CD rollback: reverting Git does not reverse database schema
changes. Any database downgrade must be separately reviewed against the exact
Alembic revision and recovery point.

### 27.4 Stop before writing the gated manifests

**Run on: no machine; this is a review checkpoint.**

The selected design is intentionally more conservative than one whole-stack
sync. The next subsection will implement only Gate A desired state: direct
backend Uvicorn startup, production zero-replica overrides, and an unregistered
migration Job file for offline validation. It will not commit, push, apply, or
synchronize anything until the rendered diff is reviewed.

### 27.5 Implement the inert Gate A desired state

This subsection changes Git working files only. It does not contact the
cluster or database.

#### Override backend startup

**Run on: current administration workstation (this Ubuntu machine), from the
root of `~/Personal/arcana-deployment`.**

Open `apps/arcana/base/backend-deployment.yaml`. In the existing `backend`
container, add `workingDir`, `command`, and `args` immediately after
`imagePullPolicy`:

```yaml
          workingDir: /app
          command:
            - /app/.venv/bin/uvicorn
          args:
            - app:app
            - --host
            - 0.0.0.0
            - --port
            - "8000"
```

The resulting container fragment must begin like this:

```yaml
      containers:
        - name: backend
          image: vanloc1808/tarot-backend:latest
          imagePullPolicy: IfNotPresent
          workingDir: /app
          command:
            - /app/.venv/bin/uvicorn
          args:
            - app:app
            - --host
            - 0.0.0.0
            - --port
            - "8000"
          ports:
```

Do not remove its probes, resources, ConfigMap, Secret, or security context.
This explicit command is the control that prevents backend Pods from invoking
`/app/start.sh` and rerunning Alembic.

Validate the edited Deployment:

```bash
cd "$HOME/Personal/arcana-deployment"

kubeconform -strict -summary -exit-on-error \
  apps/arcana/base/backend-deployment.yaml

rg -n '/app/start\.sh|alembic|/app/\.venv/bin/uvicorn' \
  apps/arcana/base/backend-deployment.yaml
```

Expected results are one valid resource and exactly the Uvicorn command. The
search must not find `/app/start.sh` or `alembic`.

#### Add production zero-replica gates

**Run on: current administration workstation (this Ubuntu machine), from the
root of `~/Personal/arcana-deployment`.**

In `apps/arcana/overlays/production/kustomization.yaml`, add this top-level
block after `images` and before `generators`:

```yaml
replicas:
  - name: arcana-backend
    count: 0
  - name: arcana-frontend
    count: 0
  - name: arcana-celery-worker
    count: 0
  - name: arcana-celery-beat
    count: 0
```

Do not add `arcana-redis` to this list. Redis remains at one replica for the
inert infrastructure baseline. These production-only overrides preserve the
base manifests' ordinary one-replica defaults while preventing application
Pods from starting during staging.

#### Author the unregistered migration Job

**Run on: current administration workstation (this Ubuntu machine), from the
root of `~/Personal/arcana-deployment`.**

Create `apps/arcana/base/backend-migration-job.yaml` with this content:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: arcana-backend-migration
  annotations:
    argocd.argoproj.io/hook: Sync
    argocd.argoproj.io/sync-wave: "-1"
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation,HookSucceeded
spec:
  backoffLimit: 1
  activeDeadlineSeconds: 900
  template:
    metadata:
      labels:
        app.kubernetes.io/name: arcana-backend-migration
        app.kubernetes.io/component: database-migration
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: vanloc1808/tarot-backend:latest
          imagePullPolicy: IfNotPresent
          workingDir: /app
          command:
            - /app/.venv/bin/alembic
          args:
            - upgrade
            - head
          envFrom:
            - configMapRef:
                name: arcana-backend-config
            - secretRef:
                name: arcana-backend-secrets
          env:
            - name: PYTHONPATH
              value: /app
          resources:
            requests:
              cpu: 50m
              memory: 128Mi
            limits:
              cpu: 250m
              memory: 512Mi
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
            readOnlyRootFilesystem: true
            seccompProfile:
              type: RuntimeDefault
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
```

Do **not** add this file to `apps/arcana/base/kustomization.yaml`. Its hook
annotations describe Gate B behavior, but leaving it unregistered guarantees
that Gate A rendering and synchronization cannot run it.

Validate the Job directly and confirm that it is still absent from the base
resource list:

```bash
kubeconform -strict -summary -exit-on-error \
  apps/arcana/base/backend-migration-job.yaml

if rg -n 'backend-migration-job\.yaml' \
  apps/arcana/base/kustomization.yaml; then
  echo 'STOP: migration Job is registered too early' >&2
  exit 1
else
  echo 'Confirmed: migration Job is not registered'
fi
```

#### Render Gate A without decrypting Secrets

**Run on: current administration workstation (this Ubuntu machine), from the
root of `~/Personal/arcana-deployment`.**

Build a temporary non-secret copy of the production overlay. The command
deliberately removes the KSOPS `generators` block, so it cannot decrypt or
print the backend Secret:

```bash
render_gate_a() {
  GATE_A_RENDER_PARENT="$HOME/.cache/arcana-deployment-renders"
  mkdir -p "$GATE_A_RENDER_PARENT" || return 1
  chmod 700 "$GATE_A_RENDER_PARENT" || return 1

  GATE_A_RENDER_TMP="$(
    mktemp -d "$GATE_A_RENDER_PARENT/gate-a.XXXXXX"
  )" || return 1
  test -n "$GATE_A_RENDER_TMP" || return 1
  test -d "$GATE_A_RENDER_TMP" || {
    echo 'STOP: Gate A temporary directory does not exist' >&2
    return 1
  }
  printf 'Gate A temporary directory: %s\n' "$GATE_A_RENDER_TMP"

  mkdir -p "$GATE_A_RENDER_TMP/apps/arcana/overlays/production" || return 1
  cp -R apps/arcana/base "$GATE_A_RENDER_TMP/apps/arcana/base" || return 1

  sed '/^generators:/,$d' \
    apps/arcana/overlays/production/kustomization.yaml \
    >"$GATE_A_RENDER_TMP/apps/arcana/overlays/production/kustomization.yaml" \
    || return 1

  test -d "$GATE_A_RENDER_TMP/apps/arcana/overlays/production" || {
    echo 'STOP: temporary production overlay does not exist' >&2
    return 1
  }

  if ! kubectl kustomize \
    "$GATE_A_RENDER_TMP/apps/arcana/overlays/production" \
    >"$GATE_A_RENDER_TMP/gate-a.yaml"; then
    echo 'STOP: Gate A render failed' >&2
    return 1
  fi

  test -s "$GATE_A_RENDER_TMP/gate-a.yaml" || {
    echo 'STOP: Gate A render is empty' >&2
    return 1
  }

  kubeconform -strict -summary -exit-on-error \
    "$GATE_A_RENDER_TMP/gate-a.yaml"
}

render_gate_a
```

The render uses Kubernetes's embedded Kustomize through `kubectl kustomize`,
so it does not depend on a separately installed or confined `kustomize`
executable. Its protected cache contains only a copy of the base manifests and
a production overlay with the Secret generator removed; it does not contain
decrypted credentials.

The summary must report 14 valid resources because the Secret generator is omitted and
the unregistered Job must not render. Inspect only the non-secret workload
gates, commands, and images:

```bash
rg -n \
  'name: arcana-(backend|frontend|celery-worker|celery-beat)$|replicas:|/app/\.venv/bin/(uvicorn|alembic)|image:' \
  "$GATE_A_RENDER_TMP/gate-a.yaml"

if rg -n 'name: arcana-backend-migration|/app/\.venv/bin/alembic' \
  "$GATE_A_RENDER_TMP/gate-a.yaml"; then
  echo 'STOP: migration Job unexpectedly rendered during Gate A' >&2
  exit 1
else
  echo 'Confirmed: migration Job is absent from Gate A'
fi
```

Review the first search carefully:

- Backend, frontend, worker, and Beat each render `replicas: 0`.
- Backend renders `/app/.venv/bin/uvicorn`.
- No rendered workload invokes Alembic.
- Backend, worker, and Beat use the immutable backend SHA.
- Frontend uses the immutable frontend SHA.
- Redis references remain `redis:7.4.10-alpine`.

Finally inspect the intended Git-only scope:

```bash
git diff --check
git status --short
git diff -- \
  apps/arcana/base/backend-deployment.yaml \
  apps/arcana/overlays/production/kustomization.yaml
```

Expected status contains only:

```text
 M apps/arcana/base/backend-deployment.yaml
 M apps/arcana/overlays/production/kustomization.yaml
?? apps/arcana/base/backend-migration-job.yaml
```

Stop here and provide the validation, render inspection, and status output for
review. Do not add the Job to Kustomize, stage files, commit, push, apply, or
synchronize the Argo CD Application.

## 28. Commit and verify the inert Gate A revision

This section records the reviewed Gate A desired state in Git and asks Argo CD
to render it without synchronizing. The migration Job remains unregistered,
all database-using Kubernetes workloads remain at zero replicas, and the
existing Docker production stack remains unchanged.

### 28.1 Verify and push the exact Gate A scope

**Run on: current administration workstation (the company Ubuntu machine),
from the root of `~/Personal/arcana-deployment`.**

If the Gate A commit has not already been created, stage only the three
reviewed files:

```bash
cd "$HOME/Personal/arcana-deployment"

git add \
  apps/arcana/base/backend-deployment.yaml \
  apps/arcana/base/backend-migration-job.yaml \
  apps/arcana/overlays/production/kustomization.yaml

git diff --cached --check
git diff --cached --stat
git status --short
```

The staged scope must contain exactly those three files. The Job file is
committed for reviewability but remains absent from
`apps/arcana/base/kustomization.yaml`.

Commit and push only when the scope is exact:

```bash
git commit -m "feat: stage gated database migration"
git push origin main
```

If the commit was already pushed, do not create a duplicate commit. Verify the
current state instead:

```bash
git status --short
git rev-parse HEAD
git rev-parse origin/main

if rg -n 'backend-migration-job\.yaml' \
  apps/arcana/base/kustomization.yaml; then
  echo 'STOP: migration Job is registered during Gate A' >&2
  false
else
  echo 'Confirmed: migration Job remains unregistered'
fi
```

Expected results are a clean status, matching local and remote revisions, and
the unregistered-Job confirmation. For this rollout, the reviewed Gate A
deployment commit is:

```text
57847592cce9fbbce1be696ead745fe95fe06df0
```

If either revision differs, use the actual matching pushed revision for the
remaining checks and review why it differs before continuing.

### 28.2 Refresh Argo CD without synchronizing

**Run on: current administration workstation (the company Ubuntu machine),
with the Section 19 SSH tunnel running. These commands contact K3s through the
dedicated local kubeconfig but do not synchronize the Application.**

Use a function so an unexpected result returns to the interactive prompt
without closing the terminal:

```bash
verify_gate_a_observation() {
  export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"

  EXPECTED_REVISION="$(
    git -C "$HOME/Personal/arcana-deployment" rev-parse HEAD
  )" || return 1

  REMOTE_REVISION="$(
    git -C "$HOME/Personal/arcana-deployment" rev-parse origin/main
  )" || return 1

  if test "$EXPECTED_REVISION" != "$REMOTE_REVISION"; then
    echo 'STOP: deployment HEAD does not match origin/main' >&2
    return 1
  fi

  kubectl annotate application -n argocd arcana-production \
    argocd.argoproj.io/refresh=hard \
    --overwrite || return 1

  for attempt in 1 2 3 4 5 6 7 8 9 10 11 12; do
    OBSERVED_REVISION="$(
      kubectl get application -n argocd arcana-production \
        -o jsonpath='{.status.sync.revision}'
    )" || return 1

    if test "$OBSERVED_REVISION" = "$EXPECTED_REVISION"; then
      break
    fi

    printf 'Waiting for Argo CD to render %s; currently %s\n' \
      "$EXPECTED_REVISION" "$OBSERVED_REVISION"
    sleep 5
  done

  if test "$OBSERVED_REVISION" != "$EXPECTED_REVISION"; then
    echo 'STOP: Argo CD did not render the pushed Gate A revision' >&2
    return 1
  fi

  kubectl get application -n argocd arcana-production \
    -o custom-columns='NAME:.metadata.name,SYNC:.status.sync.status,HEALTH:.status.health.status,REVISION:.status.sync.revision' \
    || return 1

  CONDITIONS="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{range .status.conditions[*]}{.type}{": "}{.message}{"\n"}{end}'
  )" || return 1

  if test -n "$CONDITIONS"; then
    printf '%s\n' "$CONDITIONS" >&2
    echo 'STOP: Argo CD reports Application conditions' >&2
    return 1
  fi

  INVENTORY="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{range .status.resources[*]}{.kind}{"\t"}{.namespace}{"\t"}{.name}{"\t"}{.status}{"\n"}{end}'
  )" || return 1

  printf '%s\n' "$INVENTORY" | sort

  RESOURCE_COUNT="$(
    printf '%s\n' "$INVENTORY" \
      | awk 'NF { count++ } END { print count + 0 }'
  )"

  if test "$RESOURCE_COUNT" != 15; then
    printf 'STOP: expected 15 resources, found %s\n' \
      "$RESOURCE_COUNT" >&2
    return 1
  fi

  if printf '%s\n' "$INVENTORY" \
    | awk -F '\t' '$1 == "Job" || $3 == "arcana-backend-migration" { found=1 } END { exit !found }'; then
    echo 'STOP: migration Job unexpectedly appears in Gate A' >&2
    return 1
  fi

  echo 'Confirmed: Argo CD renders 15 resources and no migration Job'

  AUTOMATED_ENABLED="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.spec.syncPolicy.automated.enabled}'
  )" || return 1

  if test "$AUTOMATED_ENABLED" != false; then
    printf 'STOP: automated synchronization is %s, not false\n' \
      "$AUTOMATED_ENABLED" >&2
    return 1
  fi

  ARCANA_NAMESPACE="$(
    kubectl get namespace arcana --ignore-not-found -o name
  )" || return 1

  if test -n "$ARCANA_NAMESPACE"; then
    echo 'STOP: arcana namespace already exists' >&2
    return 1
  fi

  echo 'Confirmed: automated synchronization is disabled'
  echo 'Confirmed: arcana namespace has not been created'
}

verify_gate_a_observation
```

Expected results:

- Argo CD observes the pushed Gate A revision.
- Sync remains `OutOfSync` and health remains `Missing`.
- No Application conditions are printed.
- The inventory remains 15 resources because the unregistered Job is absent.
- Automated synchronization is `false`.
- The `arcana` namespace remains absent.

The Application status inventory does not expose desired replica counts or
container commands. Section 27.5's successful non-secret render is the proof
that the four application Deployments are gated at zero and the backend uses
Uvicorn directly.

### 28.3 Stop before the first manual Gate A synchronization

**Run on: no machine; this is a review checkpoint.**

Do not synchronize yet. The next phase must define and review the exact manual
Gate A sync command, resource-wave behavior, Redis/PVC health checks, rollback
boundary, and proof that no application Pod or migration Job starts. Docker
Traefik and all existing Docker Arcana services remain untouched.

## 29. Perform the first inert Gate A synchronization

This is the first phase that creates Arcana resources in K3s. It is deliberately
limited to inert infrastructure: the namespace, non-secret configuration,
encrypted-at-rest Secret, internal Services, retained claims, Redis, and four
zero-replica Deployment objects. It must not run Alembic, start an application
Pod, start Kubernetes Celery Beat, expose public traffic, or alter Docker.

The sync is manually requested at the exact reviewed Git revision. Automated
synchronization remains disabled, and pruning is disabled for this operation.

### 29.1 Recheck the synchronization boundary

**Run on: current administration workstation (the company Ubuntu machine),
with the Section 19 SSH tunnel running. Commands beginning with `ssh vps` run
read-only checks on the VPS.**

Reconfirm repository and cluster inputs:

```bash
cd "$HOME/Personal/arcana-deployment"
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"

git status --short
git rev-parse HEAD
git rev-parse origin/main

kubectl get application -n argocd arcana-production \
  -o custom-columns='NAME:.metadata.name,SYNC:.status.sync.status,HEALTH:.status.health.status,REVISION:.status.sync.revision'

kubectl get application -n argocd arcana-production \
  -o jsonpath='automated={.spec.syncPolicy.automated}{"\n"}enabled={.spec.syncPolicy.automated.enabled}{"\n"}operation={.operation}{"\n"}'

kubectl get application -n argocd arcana-production \
  -o jsonpath='{range .status.resources[*]}{.kind}{"\t"}{.namespace}{"\t"}{.name}{"\n"}{end}' \
  | sort
```

Required results:

- Git status is clean and `HEAD` equals `origin/main`.
- The revision is the reviewed Gate A commit
  `57847592cce9fbbce1be696ead745fe95fe06df0`.
- Automated synchronization explicitly reports `enabled:false`.
- `operation=` is empty; do not replace an active or pending operation.
- The desired inventory contains 15 resources and no Job.

Reconfirm the live namespace is still absent with a fail-closed function:

```bash
verify_gate_a_namespace_absent() {
  ARCANA_NAMESPACE="$(
    kubectl get namespace arcana --ignore-not-found -o name
  )" || return 1

  if test -n "$ARCANA_NAMESPACE"; then
    echo 'STOP: arcana namespace already exists before Gate A sync' >&2
    return 1
  fi

  echo 'Confirmed: arcana namespace is absent before Gate A sync'
}

verify_gate_a_namespace_absent
```

Verify current production and capacity without changing them:

```bash
ssh vps '
  docker ps \
    --filter name=tarot-backend \
    --filter name=tarot-frontend \
    --filter name=tarot-celery-worker \
    --filter name=tarot-celery-beat \
    --filter name=tarot-redis \
    --filter name=traefik \
    --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  uptime
  free -h
  df -h /
  sudo du -sh /var/lib/rancher
'

kubectl top node myvps
kubectl get pods -A
```

Continue only when all five existing Docker Arcana containers and Docker
Traefik are running, Docker Traefik still publishes ports 80 and 443, disk has
at least 10 GiB available, the node has no capacity pressure, and all K3s and
Argo CD Pods are healthy.

### 29.2 Request the revision-pinned manual sync

**Run on: current administration workstation (the company Ubuntu machine).
This command changes K3s through Argo CD. It does not change Docker.**

Run the guarded synchronization function exactly once:

```bash
sync_gate_a() {
  export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"

  EXPECTED_REVISION="$(
    git -C "$HOME/Personal/arcana-deployment" rev-parse HEAD
  )" || return 1

  REMOTE_REVISION="$(
    git -C "$HOME/Personal/arcana-deployment" rev-parse origin/main
  )" || return 1

  OBSERVED_REVISION="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.status.sync.revision}'
  )" || return 1

  AUTOMATED_ENABLED="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.spec.syncPolicy.automated.enabled}'
  )" || return 1

  ACTIVE_OPERATION="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.operation}'
  )" || return 1

  if test "$EXPECTED_REVISION" != "$REMOTE_REVISION" \
    || test "$EXPECTED_REVISION" != "$OBSERVED_REVISION"; then
    echo 'STOP: local, remote, and Argo CD revisions do not match' >&2
    return 1
  fi

  if test "$AUTOMATED_ENABLED" != false; then
    echo 'STOP: automated synchronization is not disabled' >&2
    return 1
  fi

  if test -n "$ACTIVE_OPERATION"; then
    echo 'STOP: an Argo CD operation is already active or pending' >&2
    return 1
  fi

  INVENTORY="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{range .status.resources[*]}{.kind}{"\t"}{.name}{"\n"}{end}'
  )" || return 1

  RESOURCE_COUNT="$(
    printf '%s\n' "$INVENTORY" \
      | awk 'NF { count++ } END { print count + 0 }'
  )"

  if test "$RESOURCE_COUNT" != 15; then
    printf 'STOP: expected 15 desired resources, found %s\n' \
      "$RESOURCE_COUNT" >&2
    return 1
  fi

  if printf '%s\n' "$INVENTORY" \
    | awk -F '\t' '$1 == "Job" || $2 == "arcana-backend-migration" { found=1 } END { exit !found }'; then
    echo 'STOP: migration Job is present in Gate A inventory' >&2
    return 1
  fi

  ARCANA_NAMESPACE="$(
    kubectl get namespace arcana --ignore-not-found -o name
  )" || return 1

  if test -n "$ARCANA_NAMESPACE"; then
    echo 'STOP: arcana namespace already exists before first sync' >&2
    return 1
  fi

  kubectl patch application -n argocd arcana-production \
    --type=merge \
    --patch "{\"operation\":{\"initiatedBy\":{\"username\":\"gate-a-guide\"},\"sync\":{\"revision\":\"$EXPECTED_REVISION\",\"prune\":false}}}" \
    || return 1

  printf 'Requested Gate A sync at revision %s with pruning disabled\n' \
    "$EXPECTED_REVISION"
}

sync_gate_a
```

Do not run the function a second time. If it stops before `kubectl patch`, no
sync was requested. Diagnose the failed guard instead of weakening or removing
it.

### 29.3 Wait for the Gate A operation

**Run on: current administration workstation (the company Ubuntu machine).**

Wait for the one requested operation without starting another:

```bash
wait_for_gate_a() {
  export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"
  EXPECTED_REVISION="$(
    git -C "$HOME/Personal/arcana-deployment" rev-parse HEAD
  )" || return 1

  OPERATION_PHASE=''

  for attempt in $(seq 1 60); do
    OPERATION_PHASE="$(
      kubectl get application -n argocd arcana-production \
        -o jsonpath='{.status.operationState.phase}'
    )" || return 1

    OPERATION_REVISION="$(
      kubectl get application -n argocd arcana-production \
        -o jsonpath='{.status.operationState.syncResult.revision}'
    )" || return 1

    printf 'Gate A phase=%s revision=%s\n' \
      "$OPERATION_PHASE" "$OPERATION_REVISION"

    case "$OPERATION_PHASE" in
      Succeeded)
        break
        ;;
      Failed|Error)
        echo 'STOP: Gate A synchronization failed' >&2
        return 1
        ;;
    esac

    sleep 5
  done

  if test "$OPERATION_PHASE" != Succeeded; then
    echo 'STOP: Gate A synchronization did not complete within five minutes' >&2
    return 1
  fi

  if test "$OPERATION_REVISION" != "$EXPECTED_REVISION"; then
    echo 'STOP: completed operation used an unexpected revision' >&2
    return 1
  fi

  echo 'Gate A synchronization completed at the reviewed revision'
}

wait_for_gate_a
```

If the operation fails, do not delete the namespace, PVCs, Redis StatefulSet,
or Argo CD Application, and do not retry automatically. Capture the operation
message and resource results for diagnosis:

```bash
kubectl get application -n argocd arcana-production \
  -o jsonpath='{.status.operationState.message}{"\n"}'

kubectl get application -n argocd arcana-production \
  -o jsonpath='{range .status.operationState.syncResult.resources[*]}{.kind}{"\t"}{.namespace}{"\t"}{.name}{"\t"}{.status}{"\t"}{.message}{"\n"}{end}'
```

These outputs contain resource names and status messages, not Secret values.

### 29.4 Prove that Gate A is inert and healthy

**Run on: current administration workstation (the company Ubuntu machine).**

Verify Application state and live resources:

```bash
kubectl get application -n argocd arcana-production \
  -o custom-columns='NAME:.metadata.name,SYNC:.status.sync.status,HEALTH:.status.health.status,REVISION:.status.sync.revision'

kubectl get namespace arcana -o name

kubectl get deployment -n arcana \
  -o custom-columns='NAME:.metadata.name,DESIRED:.spec.replicas,READY:.status.readyReplicas,AVAILABLE:.status.availableReplicas'

kubectl get statefulset -n arcana
kubectl get pods -n arcana -o wide
kubectl get pvc -n arcana
kubectl get svc -n arcana
kubectl get ingress -n arcana
kubectl get jobs -n arcana
```

Required results:

- The Application becomes `Synced`. Health may remain `Progressing` solely
  because the zero-replica Beat Deployment has not created a first consumer
  for its claim.
- All four Deployments show desired replicas `0` and have no Pods.
- Only the `arcana-redis-0` application Pod exists and becomes `1/1 Running`.
- Redis's StatefulSet claim is `Bound`.
- `arcana-celery-beat-data` remains `Pending` during Gate A because this
  cluster's `local-path` StorageClass uses `WaitForFirstConsumer` and Beat is
  intentionally at zero replicas. It should bind only when Beat is activated
  in a later controlled phase.
- Every Service is `ClusterIP`.
- No Ingress and no Job exists.

Prove the Secret exists without printing its values, then test internal Redis:

```bash
kubectl get secret -n arcana arcana-backend-secrets \
  -o go-template='{{range $key, $value := .data}}{{printf "%s\n" $key}}{{end}}' \
  | sort

kubectl exec -n arcana statefulset/arcana-redis \
  -- redis-cli ping
```

The Secret command prints key names only. Redis must return `PONG`.

Fail closed on any forbidden live workload:

```bash
verify_gate_a_is_inert() {
  FORBIDDEN_PODS="$(
    kubectl get pods -n arcana \
      -l 'app.kubernetes.io/component in (backend,frontend,celery-worker,celery-beat,database-migration)' \
      -o name
  )" || return 1

  if test -n "$FORBIDDEN_PODS"; then
    printf 'STOP: forbidden Gate A Pods exist:\n%s\n' \
      "$FORBIDDEN_PODS" >&2
    return 1
  fi

  JOBS="$(kubectl get jobs -n arcana -o name)" || return 1
  if test -n "$JOBS"; then
    printf 'STOP: a Job exists during Gate A:\n%s\n' "$JOBS" >&2
    return 1
  fi

  AUTOMATED_ENABLED="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.spec.syncPolicy.automated.enabled}'
  )" || return 1

  if test "$AUTOMATED_ENABLED" != false; then
    echo 'STOP: automated synchronization is no longer disabled' >&2
    return 1
  fi

  echo 'Confirmed: Gate A has no application or migration Pods'
  echo 'Confirmed: automated synchronization remains disabled'
}

verify_gate_a_is_inert
```

Finally prove Docker production and host ingress remain unchanged and recheck
capacity:

```bash
ssh vps '
  docker ps \
    --filter name=tarot-backend \
    --filter name=tarot-frontend \
    --filter name=tarot-celery-worker \
    --filter name=tarot-celery-beat \
    --filter name=tarot-redis \
    --filter name=traefik \
    --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  sudo ss -lntup | grep -E ":(80|443|6443)\\b"
  df -h /
  sudo du -sh /var/lib/rancher
'

kubectl top node myvps
```

Docker Traefik must still own ports 80 and 443, every Docker Arcana service
must remain running, disk must remain above the 10 GiB floor, and node capacity
must remain healthy.

### 29.5 Gate A rollback boundary and stop point

**Run on: no machine; this is a review checkpoint.**

Gate A creates no application traffic and makes no database schema change. If
Redis or storage is unhealthy, diagnose the specific resource in place. Do not
delete retained claims, the namespace, or the Application as an automatic
rollback. Git rollback plus another explicitly reviewed manual sync may revert
ordinary manifests, but retained storage requires a separate data-aware
decision.

The `local-path` StorageClass has reclaim policy `Delete`. The Beat claim's
Argo CD `Prune=false` annotation prevents ordinary Git pruning, but it does not
protect data from a deliberate PVC deletion. Never delete either claim merely
to change Application health from `Progressing` to `Healthy`.

Do not register or run the migration Job yet. The next phase must confirm a
current database recovery point, review the exact packaged migration path to
`20260723_reset_token_hash`, register the Job in a dedicated commit, and run a
second revision-pinned manual sync while all application Deployments remain at
zero replicas.

## 30. Verify the Gate B database recovery boundary

Gate B transfers migration ownership from Docker backend startup to a dedicated
Kubernetes Job. Before registering that Job, identify the database provider,
confirm a usable recovery point, and read the production Alembic revision with
the exact pinned image. These checks do not change the schema.

The existing Docker backend has already started through `/app/start.sh`, which
runs `alembic upgrade head`. Production may therefore already be at
`20260723_reset_token_hash`; if so, the first dedicated Job should be a no-op.
That result is acceptable and establishes the safer migration mechanism for
future releases.

### 30.1 Identify the provider without exposing the database URL

**Run on: current administration workstation (the company Ubuntu machine),
from the root of `~/Personal/arcana-deployment`.**

Decrypt only into a pipe, classify the hostname in memory, and print neither
the URL nor hostname:

```bash
cd "$HOME/Personal/arcana-deployment"
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"
test -r "$SOPS_AGE_KEY_FILE"
test "$(stat -c '%a' "$SOPS_AGE_KEY_FILE")" = 600

sops --decrypt \
  --extract '["stringData"]["SQLALCHEMY_DATABASE_URL"]' \
  apps/arcana/overlays/production/backend-secret.sops.yaml \
  | python3 -c '
import sys
from urllib.parse import urlparse

value = sys.stdin.read().strip()
parsed = urlparse(value)
host = (parsed.hostname or "").lower()

is_postgres = parsed.scheme in {"postgres", "postgresql"} or parsed.scheme.startswith("postgresql+")
if not is_postgres or not host:
    raise SystemExit("STOP: database URL is not a valid PostgreSQL URL")

if host == "supabase.com" or host.endswith(".supabase.com"):
    print("Database provider: Supabase")
else:
    print("Database provider: non-Supabase or unrecognized")
    raise SystemExit(1)
'
```

Expected output is only `Database provider: Supabase`. Stop if the provider is
unrecognized; do not print the URL to diagnose it.

### 30.2 Confirm a recoverable Supabase backup

**Run on: current administration workstation (the company Ubuntu machine), in
the Supabase Dashboard. No terminal command is required.**

Open the production Supabase project, then open **Database > Backups**. Before
continuing, verify all of the following:

- The project identity is the one used by Arcana production.
- A successful daily backup or PITR recovery window exists.
- Its timestamp is recent enough for the accepted recovery-point objective.
- The restore action is available to the current administrator.
- The recovery timestamp and backup type are recorded in private operations
  notes, not Git and not chat.

Supabase documents automatic daily backups for Pro, Team, and Enterprise
projects, while PITR is a separately enabled option. Do not infer backup
coverage from the existence of the project or from its plan name; verify the
actual Backups page. If no usable provider recovery point exists, stop Gate B
and create and validate a separate logical backup procedure before any
schema-changing migration. A narrowly scoped Free-tier exception may be
accepted only after Sections 30.3 and 30.4 prove that production `current`
already equals the pinned image `heads`, making the proposed `upgrade head` a
no-op. Record that explicit risk acceptance privately. Any future revision gap
immediately restores the backup requirement. Do not start a restore merely to
perform this check.

### 30.3 Read the production Alembic revision without migrating

**Run on: current administration workstation (the company Ubuntu machine),
from the root of `~/Personal/arcana-deployment`.**

Use a function so the decrypted URL exists only in the function environment
and is unset immediately afterward. The URL is passed to Docker by environment
name, never placed in a command-line argument or printed:

```bash
check_production_alembic_revision() {
  local BACKEND_IMAGE_TAG SQLALCHEMY_DATABASE_URL RESULT
  export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"

  BACKEND_IMAGE_TAG="$(
    awk '
      $1 == "-" && $2 == "name:" && $3 == "vanloc1808/tarot-backend" { in_backend=1; next }
      in_backend && $1 == "newTag:" { print $2; exit }
    ' apps/arcana/overlays/production/kustomization.yaml
  )" || return 1

  printf '%s\n' "$BACKEND_IMAGE_TAG" \
    | rg -x '[0-9a-f]{40}' >/dev/null || return 1

  SQLALCHEMY_DATABASE_URL="$(
    sops --decrypt \
      --extract '["stringData"]["SQLALCHEMY_DATABASE_URL"]' \
      apps/arcana/overlays/production/backend-secret.sops.yaml
  )" || return 1

  export SQLALCHEMY_DATABASE_URL

  docker run --rm \
    --platform linux/amd64 \
    -e SQLALCHEMY_DATABASE_URL \
    --entrypoint /app/.venv/bin/alembic \
    "vanloc1808/tarot-backend:$BACKEND_IMAGE_TAG" \
    -c /app/alembic.ini current
  RESULT=$?

  unset SQLALCHEMY_DATABASE_URL
  return "$RESULT"
}

check_production_alembic_revision
unset -f check_production_alembic_revision
```

`alembic current` reads the `alembic_version` table and migration files; it
does not execute `upgrade` or `downgrade`. Expected output is a revision ID,
normally:

```text
20260723_reset_token_hash (head)
```

If no revision, more than one current revision, a connection error, or any
other output appears, stop and retain the non-secret error text for diagnosis.
Do not test connectivity with a migration command.

### 30.4 Compare current and packaged heads

**Run on: current administration workstation (the company Ubuntu machine).**

Reconfirm the packaged head without database credentials:

```bash
BACKEND_IMAGE_TAG="$(
  awk '
    $1 == "-" && $2 == "name:" && $3 == "vanloc1808/tarot-backend" { in_backend=1; next }
    in_backend && $1 == "newTag:" { print $2; exit }
  ' apps/arcana/overlays/production/kustomization.yaml
)"

printf '%s\n' "$BACKEND_IMAGE_TAG" \
  | rg -x '[0-9a-f]{40}' >/dev/null

docker run --rm \
  --platform linux/amd64 \
  --entrypoint /app/.venv/bin/alembic \
  "vanloc1808/tarot-backend:$BACKEND_IMAGE_TAG" \
  -c /app/alembic.ini heads
```

Interpret the result:

- If `current` and `heads` both report `20260723_reset_token_hash`, the
  dedicated Gate B Job is expected to succeed as a no-op. For this rollout,
  both commands produced that exact revision. The operator explicitly accepted
  proceeding on Supabase Free without a provider backup only for this no-op
  ownership-transfer run.
- If `current` is an earlier single revision, do not proceed until every
  intervening migration has been reviewed for locking, runtime, backward
  compatibility with the still-running Docker backend, and RLS on every newly
  created Postgres table.
- If current is ahead of the packaged head or belongs to a different branch,
  stop. The pinned image is not authorized to migrate that database.

### 30.5 Stop before registering the Job

**Run on: no machine; this is a review checkpoint.**

Do not edit `apps/arcana/base/kustomization.yaml` yet. Provide the provider
classification, private confirmation of either a usable recovery point or the
narrow no-op Free-tier exception above, and the non-secret `current` and
`heads` output for review. Do not provide the database URL, hostname,
password, project reference, or backup identifiers.

The next section will register the already validated Job in a dedicated Git
commit, verify that the four application Deployments still render at zero,
and refresh Argo CD without synchronizing. The migration itself remains a
later, separately authorized revision-pinned operation.

## 31. Register the Gate B migration Job without running it

Register the already validated migration Job in desired state through a
dedicated Git commit. This phase proves that Kustomize and Argo CD can render
the hook with the immutable backend image while all application Deployments
remain at zero replicas. It must not request a sync operation.

### 31.1 Recheck the live Gate A boundary

**Run on: current administration workstation (the company Ubuntu machine),
with the Section 19 SSH tunnel running.**

```bash
cd "$HOME/Personal/arcana-deployment"
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"

git status --short
git rev-parse HEAD
git rev-parse origin/main

kubectl get application -n argocd arcana-production \
  -o jsonpath='sync={.status.sync.status}{"\n"}health={.status.health.status}{"\n"}revision={.status.sync.revision}{"\n"}enabled={.spec.syncPolicy.automated.enabled}{"\n"}operation={.operation}{"\n"}'

kubectl get deployment -n arcana \
  -o custom-columns='NAME:.metadata.name,DESIRED:.spec.replicas,READY:.status.readyReplicas'

kubectl get jobs -n arcana
kubectl get pods -n arcana -o wide
```

Required results before editing Git:

- Both Git revisions equal Gate A commit
  `57847592cce9fbbce1be696ead745fe95fe06df0` and the worktree is clean.
- Automated synchronization is `false` and `operation=` is empty.
- All four Deployments remain at zero replicas.
- No Job exists.
- Redis is the only Arcana Pod and is healthy.

Stop on any difference. Do not reconcile it by deleting or scaling a live
resource.

### 31.2 Register the reviewed Job

**Run on: current administration workstation (the company Ubuntu machine),
from the root of `~/Personal/arcana-deployment`. This edits Git only.**

In `apps/arcana/base/kustomization.yaml`, add the already committed Job file to
the `resources` list immediately after `backend-deployment.yaml`:

```yaml
resources:
  - namespace.yaml
  - backend-service.yaml
  - backend-configmap.yaml
  - backend-deployment.yaml
  - backend-migration-job.yaml
  - redis-service.yaml
  - redis-statefulset.yaml
  - redis-networkpolicy.yaml
  - frontend-deployment.yaml
  - frontend-service.yaml
  - celery-worker-deployment.yaml
  - celery-worker-service.yaml
  - celery-beat-pvc.yaml
  - celery-beat-deployment.yaml
  - celery-beat-service.yaml
```

Do not edit the Job, production replica gates, images, Secret generator, or
Argo CD Application in this subsection.

### 31.3 Validate the registered Gate B render

**Run on: current administration workstation (the company Ubuntu machine),
from the root of `~/Personal/arcana-deployment`. These are offline Git checks.**

Validate the source Job and complete base:

```bash
kubeconform -strict -summary -exit-on-error \
  apps/arcana/base/backend-migration-job.yaml

kubectl kustomize apps/arcana/base \
  | kubeconform -strict -summary -exit-on-error
```

Expected results are one valid Job and 15 valid base resources.

Render a non-secret production copy. This uses the protected Ubuntu cache and
removes the KSOPS generator before rendering:

```bash
render_gate_b_registration() {
  GATE_B_RENDER_PARENT="$HOME/.cache/arcana-deployment-renders"
  mkdir -p "$GATE_B_RENDER_PARENT" || return 1
  chmod 700 "$GATE_B_RENDER_PARENT" || return 1

  GATE_B_RENDER_TMP="$(
    mktemp -d "$GATE_B_RENDER_PARENT/gate-b-registration.XXXXXX"
  )" || return 1

  test -d "$GATE_B_RENDER_TMP" || return 1
  printf 'Gate B temporary directory: %s\n' "$GATE_B_RENDER_TMP"

  mkdir -p "$GATE_B_RENDER_TMP/apps/arcana/overlays/production" \
    || return 1
  cp -R apps/arcana/base "$GATE_B_RENDER_TMP/apps/arcana/base" \
    || return 1

  sed '/^generators:/,$d' \
    apps/arcana/overlays/production/kustomization.yaml \
    >"$GATE_B_RENDER_TMP/apps/arcana/overlays/production/kustomization.yaml" \
    || return 1

  if ! kubectl kustomize \
    "$GATE_B_RENDER_TMP/apps/arcana/overlays/production" \
    >"$GATE_B_RENDER_TMP/gate-b-registration.yaml"; then
    echo 'STOP: Gate B registration render failed' >&2
    return 1
  fi

  test -s "$GATE_B_RENDER_TMP/gate-b-registration.yaml" || {
    echo 'STOP: Gate B registration render is empty' >&2
    return 1
  }

  kubeconform -strict -summary -exit-on-error \
    "$GATE_B_RENDER_TMP/gate-b-registration.yaml"
}

render_gate_b_registration
```

The non-secret production render must contain 15 valid resources: the prior 14
non-secret resources plus the newly registered Job. The KSOPS-generated Secret
is intentionally absent from this temporary render.

Inspect the Job contract and workload gates without printing Secret data:

```bash
rg -n \
  'kind: Job|name: arcana-backend-migration|argocd.argoproj.io/(hook|sync-wave|hook-delete-policy)|replicas:|/app/\.venv/bin/(alembic|uvicorn)|image:' \
  "$GATE_B_RENDER_TMP/gate-b-registration.yaml"

git diff --check
git status --short
git diff -- apps/arcana/base/kustomization.yaml
```

Required render evidence:

- Exactly one Job named `arcana-backend-migration` exists.
- It is a `Sync` hook at wave `-1` with
  `BeforeHookCreation,HookSucceeded` cleanup.
- It executes `/app/.venv/bin/alembic upgrade head`.
- Its image is the immutable backend SHA, not `latest`.
- Backend executes Uvicorn directly.
- Backend, frontend, worker, and Beat still render `replicas: 0`.
- Git shows only `apps/arcana/base/kustomization.yaml` modified.

Stop if any requirement differs. Do not stage or push until the output has
been reviewed.

### 31.4 Commit and push registration only

**Run on: current administration workstation (the company Ubuntu machine),
from the root of `~/Personal/arcana-deployment`.**

Stage only the Kustomization change:

```bash
git add apps/arcana/base/kustomization.yaml
git diff --cached --check
git diff --cached --stat
git status --short
```

The only staged path must be:

```text
apps/arcana/base/kustomization.yaml
```

Commit and push:

```bash
git commit -m "feat: register database migration job"
git push origin main

git status --short
git rev-parse HEAD
git rev-parse origin/main
```

The status must be clean and the revisions must match. Pushing changes desired
state only; automated synchronization remains disabled, so the Job must not
start.

### 31.5 Refresh Argo CD without starting Gate B

**Run on: current administration workstation (the company Ubuntu machine),
with the Section 19 SSH tunnel running.**

Request only a hard refresh:

```bash
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"

kubectl annotate application -n argocd arcana-production \
  argocd.argoproj.io/refresh=hard \
  --overwrite
```

Wait until `.status.sync.revision` equals the pushed registration commit, then
verify that rendering succeeded without an operation:

```bash
verify_gate_b_registration() {
  EXPECTED_REVISION="$(
    git -C "$HOME/Personal/arcana-deployment" rev-parse HEAD
  )" || return 1

  OBSERVED_REVISION=''
  for attempt in $(seq 1 12); do
    OBSERVED_REVISION="$(
      kubectl get application -n argocd arcana-production \
        -o jsonpath='{.status.sync.revision}'
    )" || return 1

    test "$OBSERVED_REVISION" = "$EXPECTED_REVISION" && break
    printf 'Waiting for registration render; currently %s\n' \
      "$OBSERVED_REVISION"
    sleep 5
  done

  if test "$OBSERVED_REVISION" != "$EXPECTED_REVISION"; then
    echo 'STOP: Argo CD did not render the registration commit' >&2
    return 1
  fi

  CONDITIONS="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{range .status.conditions[*]}{.type}{": "}{.message}{"\n"}{end}'
  )" || return 1

  if test -n "$CONDITIONS"; then
    printf '%s\n' "$CONDITIONS" >&2
    echo 'STOP: Argo CD reports render conditions' >&2
    return 1
  fi

  ACTIVE_OPERATION="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.operation}'
  )" || return 1

  if test -n "$ACTIVE_OPERATION"; then
    echo 'STOP: an Argo CD operation unexpectedly exists' >&2
    return 1
  fi

  AUTOMATED_ENABLED="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.spec.syncPolicy.automated.enabled}'
  )" || return 1

  if test "$AUTOMATED_ENABLED" != false; then
    echo 'STOP: automated synchronization is not disabled' >&2
    return 1
  fi

  LIVE_JOBS="$(kubectl get jobs -n arcana -o name)" || return 1
  if test -n "$LIVE_JOBS"; then
    printf 'STOP: a Job started during registration:\n%s\n' \
      "$LIVE_JOBS" >&2
    return 1
  fi

  echo 'Confirmed: registration revision rendered without conditions'
  echo 'Confirmed: no operation or live Job exists'
  echo 'Confirmed: automated synchronization remains disabled'
}

verify_gate_b_registration
```

Argo CD may report the Application `Synced` or `OutOfSync` depending on how
the current version accounts for an unexecuted hook in sync status. Do not use
that field alone as proof. The required safety evidence is the matching
revision, no render conditions, empty `.operation`, no live Job, and automated
sync disabled.

Reconfirm live workload gates:

```bash
kubectl get deployment -n arcana \
  -o custom-columns='NAME:.metadata.name,DESIRED:.spec.replicas,READY:.status.readyReplicas'
kubectl get pods -n arcana -o wide
kubectl get jobs -n arcana
```

All Deployments must remain at zero, Redis must remain the only Pod, and no Job
may exist.

### 31.6 Stop before executing Gate B

**Run on: no machine; this is a review checkpoint.**

Do not request a sync operation yet. The next section must pin the exact
registration revision, recheck that production `current` still equals
`20260723_reset_token_hash`, execute the one no-op migration hook, retain any
failed Job for diagnosis, and prove the database revision is unchanged after
success. Docker production remains untouched throughout.

## 32. Execute the no-op Gate B migration hook

Run the registered migration Job exactly once at the reviewed registration
revision. Production `current` and packaged `heads` already match, so
`alembic upgrade head` is expected to connect, acquire the normal Alembic
context, make no schema changes, and exit successfully.

This section does not activate any application Deployment or change public
traffic. All four Deployments remain at zero, Docker continues serving
production, and automated synchronization remains disabled.

### 32.1 Revalidate the no-op and live safety boundary

**Run on: current administration workstation (the company Ubuntu machine),
from the root of `~/Personal/arcana-deployment`, with the Section 19 SSH tunnel
running.**

Recheck Git, Argo CD, and live workloads:

```bash
cd "$HOME/Personal/arcana-deployment"
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"

git status --short
git rev-parse HEAD
git rev-parse origin/main

kubectl get application -n argocd arcana-production \
  -o jsonpath='revision={.status.sync.revision}{"\n"}enabled={.spec.syncPolicy.automated.enabled}{"\n"}operation={.operation}{"\n"}'

kubectl get deployment -n arcana \
  -o custom-columns='NAME:.metadata.name,DESIRED:.spec.replicas,READY:.status.readyReplicas'
kubectl get pods -n arcana -o wide
kubectl get jobs -n arcana
```

Required results:

- The worktree is clean.
- `HEAD`, `origin/main`, and Argo CD revision all equal
  `9222b603f7675a948df58a64d2310913b8721ac3`.
- Automated synchronization is `false` and `operation=` is empty.
- Every application Deployment remains at zero.
- Redis is the only Arcana Pod and no Job exists.

Immediately re-read production `current` with the pinned image. The decrypted
URL remains function-local and is never printed:

```bash
check_gate_b_is_still_noop() {
  local BACKEND_IMAGE_TAG SQLALCHEMY_DATABASE_URL RESULT
  local CURRENT_REVISION PACKAGED_HEAD
  export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"

  BACKEND_IMAGE_TAG="$(
    awk '
      $1 == "-" && $2 == "name:" && $3 == "vanloc1808/tarot-backend" { in_backend=1; next }
      in_backend && $1 == "newTag:" { print $2; exit }
    ' apps/arcana/overlays/production/kustomization.yaml
  )" || return 1

  printf '%s\n' "$BACKEND_IMAGE_TAG" \
    | rg -x '[0-9a-f]{40}' >/dev/null || return 1

  SQLALCHEMY_DATABASE_URL="$(
    sops --decrypt \
      --extract '["stringData"]["SQLALCHEMY_DATABASE_URL"]' \
      apps/arcana/overlays/production/backend-secret.sops.yaml
  )" || return 1
  export SQLALCHEMY_DATABASE_URL

  CURRENT_REVISION="$(
    docker run --rm \
      --platform linux/amd64 \
      -e SQLALCHEMY_DATABASE_URL \
      --entrypoint /app/.venv/bin/alembic \
      "vanloc1808/tarot-backend:$BACKEND_IMAGE_TAG" \
      -c /app/alembic.ini current
  )"
  RESULT=$?
  unset SQLALCHEMY_DATABASE_URL
  test "$RESULT" = 0 || return "$RESULT"

  PACKAGED_HEAD="$(
    docker run --rm \
      --platform linux/amd64 \
      --entrypoint /app/.venv/bin/alembic \
      "vanloc1808/tarot-backend:$BACKEND_IMAGE_TAG" \
      -c /app/alembic.ini heads
  )" || return 1

  printf 'current=%s\nheads=%s\n' \
    "$CURRENT_REVISION" "$PACKAGED_HEAD"

  if test "$CURRENT_REVISION" != '20260723_reset_token_hash (head)' \
    || test "$PACKAGED_HEAD" != '20260723_reset_token_hash (head)'; then
    echo 'STOP: Gate B is no longer a verified no-op' >&2
    return 1
  fi

  echo 'Confirmed: Gate B remains a no-op'
}

check_gate_b_is_still_noop
unset -f check_gate_b_is_still_noop
```

Stop if either revision differs by even one character.

Recheck Docker production, disk, and node capacity:

```bash
ssh vps '
  docker ps \
    --filter name=tarot-backend \
    --filter name=tarot-frontend \
    --filter name=tarot-celery-worker \
    --filter name=tarot-celery-beat \
    --filter name=tarot-redis \
    --filter name=traefik \
    --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  df -h /
  sudo du -sh /var/lib/rancher
'

kubectl top node myvps
```

Continue only with all Docker services healthy, Traefik still publishing ports
80/443, at least 10 GiB free, and healthy node capacity.

### 32.2 Validate and request the exact Gate B operation

**Run on: current administration workstation (the company Ubuntu machine).
The server-side dry-run does not change the Application. The final patch starts
the one migration sync.**

First validate the exact operation payload:

```bash
kubectl patch application -n argocd arcana-production \
  --type=merge \
  --patch '{"operation":{"initiatedBy":{"username":"gate-b-noop-guide"},"sync":{"revision":"9222b603f7675a948df58a64d2310913b8721ac3","prune":false}}}' \
  --dry-run=server \
  -o jsonpath='revision={.operation.sync.revision}{"\n"}prune={.operation.sync.prune}{"\n"}initiator={.operation.initiatedBy.username}{"\n"}'
```

Expected output:

```text
revision=9222b603f7675a948df58a64d2310913b8721ac3
prune=false
initiator=gate-b-noop-guide
```

Then run the guarded operation function once:

```bash
sync_gate_b_noop() {
  local EXPECTED_REVISION REMOTE_REVISION OBSERVED_REVISION
  local AUTOMATED_ENABLED ACTIVE_OPERATION LIVE_JOBS

  EXPECTED_REVISION="$(
    git -C "$HOME/Personal/arcana-deployment" rev-parse HEAD
  )" || return 1
  REMOTE_REVISION="$(
    git -C "$HOME/Personal/arcana-deployment" rev-parse origin/main
  )" || return 1
  OBSERVED_REVISION="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.status.sync.revision}'
  )" || return 1

  if test "$EXPECTED_REVISION" != '9222b603f7675a948df58a64d2310913b8721ac3' \
    || test "$EXPECTED_REVISION" != "$REMOTE_REVISION" \
    || test "$EXPECTED_REVISION" != "$OBSERVED_REVISION"; then
    echo 'STOP: Gate B revisions do not match the reviewed commit' >&2
    return 1
  fi

  AUTOMATED_ENABLED="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.spec.syncPolicy.automated.enabled}'
  )" || return 1
  ACTIVE_OPERATION="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.operation}'
  )" || return 1
  LIVE_JOBS="$(kubectl get jobs -n arcana -o name)" || return 1

  test "$AUTOMATED_ENABLED" = false || {
    echo 'STOP: automated synchronization is not disabled' >&2
    return 1
  }
  test -z "$ACTIVE_OPERATION" || {
    echo 'STOP: an Argo CD operation is already active or pending' >&2
    return 1
  }
  test -z "$LIVE_JOBS" || {
    printf 'STOP: a Job already exists:\n%s\n' "$LIVE_JOBS" >&2
    return 1
  }

  NONZERO_DEPLOYMENTS="$(
    kubectl get deployment -n arcana \
      -o jsonpath='{range .items[?(@.spec.replicas!=0)]}{.metadata.name}{"\n"}{end}'
  )" || return 1
  test -z "$NONZERO_DEPLOYMENTS" || {
    printf 'STOP: nonzero Deployments exist:\n%s\n' \
      "$NONZERO_DEPLOYMENTS" >&2
    return 1
  }

  kubectl patch application -n argocd arcana-production \
    --type=merge \
    --patch "{\"operation\":{\"initiatedBy\":{\"username\":\"gate-b-noop-guide\"},\"sync\":{\"revision\":\"$EXPECTED_REVISION\",\"prune\":false}}}" \
    || return 1

  printf 'Requested no-op Gate B sync at %s\n' "$EXPECTED_REVISION"
}

sync_gate_b_noop
unset -f sync_gate_b_noop
```

Do not run the function twice.

### 32.3 Wait for the migration hook result

**Run on: current administration workstation (the company Ubuntu machine).**

The previous Gate A operation also succeeded, so do not accept a stale
`Succeeded` phase. Require both the Gate B revision and successful phase:

```bash
wait_for_gate_b_noop() {
  local EXPECTED_REVISION PHASE OPERATION_REVISION
  EXPECTED_REVISION='9222b603f7675a948df58a64d2310913b8721ac3'
  PHASE=''
  OPERATION_REVISION=''

  for attempt in $(seq 1 180); do
    PHASE="$(
      kubectl get application -n argocd arcana-production \
        -o jsonpath='{.status.operationState.phase}'
    )" || return 1
    OPERATION_REVISION="$(
      kubectl get application -n argocd arcana-production \
        -o jsonpath='{.status.operationState.syncResult.revision}'
    )" || return 1

    printf 'Gate B phase=%s revision=%s\n' "$PHASE" "$OPERATION_REVISION"

    if test "$OPERATION_REVISION" = "$EXPECTED_REVISION"; then
      case "$PHASE" in
        Succeeded)
          break
          ;;
        Failed|Error)
          echo 'STOP: Gate B migration operation failed' >&2
          return 1
          ;;
      esac
    fi

    sleep 5
  done

  if test "$PHASE" != Succeeded \
    || test "$OPERATION_REVISION" != "$EXPECTED_REVISION"; then
    echo 'STOP: Gate B did not succeed within fifteen minutes' >&2
    return 1
  fi

  echo 'Gate B migration operation succeeded at the reviewed revision'
}

wait_for_gate_b_noop
unset -f wait_for_gate_b_noop
```

On failure, the `BeforeHookCreation,HookSucceeded` policy leaves the failed Job
for diagnosis. Do not delete or retry it. Capture status and logs without
printing Secret values:

```bash
kubectl get application -n argocd arcana-production \
  -o jsonpath='{.status.operationState.message}{"\n"}'

kubectl get application -n argocd arcana-production \
  -o jsonpath='{range .status.operationState.syncResult.resources[*]}{.kind}{"\t"}{.namespace}{"\t"}{.name}{"\t"}{.hookPhase}{"\t"}{.status}{"\t"}{.message}{"\n"}{end}'

kubectl get jobs,pods -n arcana
kubectl logs -n arcana job/arcana-backend-migration --all-containers
```

Stop for diagnosis after collecting this evidence.

### 32.4 Verify success and unchanged database revision

**Run on: current administration workstation (the company Ubuntu machine).**

Inspect the completed operation record. The successful Job may already be
deleted by its hook policy, so Argo CD operation status is the durable evidence:

```bash
kubectl get application -n argocd arcana-production \
  -o jsonpath='{.status.operationState.message}{"\n"}'

kubectl get application -n argocd arcana-production \
  -o jsonpath='{range .status.operationState.syncResult.resources[*]}{.kind}{"\t"}{.namespace}{"\t"}{.name}{"\t"}{.hookPhase}{"\t"}{.status}{"\t"}{.message}{"\n"}{end}'
```

The operation message must report success. The resource results must include
`Job/arcana-backend-migration` with successful hook status or phase and no
failure message.

Confirm cleanup and the inert workload boundary:

```bash
kubectl get jobs -n arcana
kubectl get deployment -n arcana \
  -o custom-columns='NAME:.metadata.name,DESIRED:.spec.replicas,READY:.status.readyReplicas'
kubectl get pods -n arcana -o wide

kubectl get application -n argocd arcana-production \
  -o jsonpath='sync={.status.sync.status}{"\n"}health={.status.health.status}{"\n"}revision={.status.sync.revision}{"\n"}enabled={.spec.syncPolicy.automated.enabled}{"\n"}operation={.operation}{"\n"}'
```

Required results:

- No live Job remains after successful hook cleanup.
- All application Deployments remain at zero.
- Redis remains the only Arcana Pod.
- The revision remains the registration commit.
- Automated synchronization remains `false` and `operation=` becomes empty.

Repeat the read-only production revision check from Section 32.1. It must still
print:

```text
current=20260723_reset_token_hash (head)
heads=20260723_reset_token_hash (head)
Confirmed: Gate B remains a no-op
```

This before-and-after equality is proof that the ownership-transfer run made
no schema revision change.

Finally recheck Docker and capacity:

```bash
ssh vps '
  docker ps \
    --filter name=tarot-backend \
    --filter name=tarot-frontend \
    --filter name=tarot-celery-worker \
    --filter name=tarot-celery-beat \
    --filter name=tarot-redis \
    --filter name=traefik \
    --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  df -h /
  sudo du -sh /var/lib/rancher
'

kubectl top node myvps
```

Docker production must remain unchanged, disk must remain above 10 GiB, and
node capacity must remain healthy.

### 32.5 Gate B completion and stop point

**Run on: no machine; this is a review checkpoint.**

Gate B is complete only after the hook succeeds, its live Job is cleaned up,
the production revision remains unchanged, all Kubernetes application
Deployments remain at zero, and Docker production remains healthy.

Do not activate backend, frontend, worker, or Beat yet. The next phase must
design staged workload activation and internal smoke testing. Kubernetes Beat
must remain at zero until Docker Beat is deliberately stopped and verified
during its own cutover. Public ingress remains on Docker Traefik.

## 33. Retire the completed migration hook

The Gate B operation at revision
`9222b603f7675a948df58a64d2310913b8721ac3` succeeded. Argo CD recorded
`Job/arcana-backend-migration` with hook phase `Succeeded`, deleted the live
Job according to `HookSucceeded`, and production remained at
`20260723_reset_token_hash` before and after execution. All application
Deployments stayed at zero and Docker remained production.

A `Sync` hook registered in desired state runs again on later sync operations.
Remove it from the active Kustomization now so ordinary backend/frontend/worker
activation cannot rerun Alembic. Keep the reviewed Job file in Git as an
unregistered template for a future, separately reviewed migration revision.

### 33.1 Reconfirm Gate B completion

**Run on: current administration workstation (the company Ubuntu machine),
with the Section 19 SSH tunnel running.**

```bash
cd "$HOME/Personal/arcana-deployment"
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"

git status --short
git rev-parse HEAD
git rev-parse origin/main

kubectl get application -n argocd arcana-production \
  -o jsonpath='message={.status.operationState.message}{"\n"}phase={.status.operationState.phase}{"\n"}operationRevision={.status.operationState.syncResult.revision}{"\n"}enabled={.spec.syncPolicy.automated.enabled}{"\n"}operation={.operation}{"\n"}'

kubectl get application -n argocd arcana-production \
  -o jsonpath='{range .status.operationState.syncResult.resources[*]}{.kind}{"\t"}{.name}{"\t"}{.hookPhase}{"\t"}{.status}{"\t"}{.message}{"\n"}{end}' \
  | awk -F '\t' '$1 == "Job" || $2 == "arcana-backend-migration"'

kubectl get jobs -n arcana
kubectl get deployment -n arcana \
  -o custom-columns='NAME:.metadata.name,DESIRED:.spec.replicas,READY:.status.readyReplicas'
kubectl get pods -n arcana -o wide
```

Required results:

- Git is clean at registration revision
  `9222b603f7675a948df58a64d2310913b8721ac3`.
- The latest operation is `Succeeded` at that revision.
- Its Job result is `Succeeded` and `Synced`.
- Automated synchronization is `false` and `operation=` is empty.
- No live Job exists.
- All application Deployments remain at zero and Redis is the only Pod.

Stop on any difference.

### 33.2 Unregister only the completed hook

**Run on: current administration workstation (the company Ubuntu machine),
from the root of `~/Personal/arcana-deployment`. This edits Git only.**

Remove only this line from the `resources` list in
`apps/arcana/base/kustomization.yaml`:

```yaml
  - backend-migration-job.yaml
```

Do not delete or edit `apps/arcana/base/backend-migration-job.yaml`. Do not
change replica counts, images, Secrets, Services, or the Argo CD Application.

Validate that the file remains tracked but inactive:

```bash
test -f apps/arcana/base/backend-migration-job.yaml

if rg -n 'backend-migration-job\.yaml' \
  apps/arcana/base/kustomization.yaml; then
  echo 'STOP: completed migration hook remains registered' >&2
  false
else
  echo 'Confirmed: completed migration hook is unregistered'
fi

kubeconform -strict -summary -exit-on-error \
  apps/arcana/base/backend-migration-job.yaml

kubectl kustomize apps/arcana/base \
  | kubeconform -strict -summary -exit-on-error
```

Expected results are one valid inactive Job template and 14 valid active base
resources.

### 33.3 Render the post-migration inactive state

**Run on: current administration workstation (the company Ubuntu machine),
from the root of `~/Personal/arcana-deployment`.**

```bash
render_post_migration_baseline() {
  POST_MIGRATION_PARENT="$HOME/.cache/arcana-deployment-renders"
  mkdir -p "$POST_MIGRATION_PARENT" || return 1
  chmod 700 "$POST_MIGRATION_PARENT" || return 1

  POST_MIGRATION_TMP="$(
    mktemp -d "$POST_MIGRATION_PARENT/post-migration.XXXXXX"
  )" || return 1
  test -d "$POST_MIGRATION_TMP" || return 1

  mkdir -p "$POST_MIGRATION_TMP/apps/arcana/overlays/production" \
    || return 1
  cp -R apps/arcana/base "$POST_MIGRATION_TMP/apps/arcana/base" \
    || return 1

  sed '/^generators:/,$d' \
    apps/arcana/overlays/production/kustomization.yaml \
    >"$POST_MIGRATION_TMP/apps/arcana/overlays/production/kustomization.yaml" \
    || return 1

  if ! kubectl kustomize \
    "$POST_MIGRATION_TMP/apps/arcana/overlays/production" \
    >"$POST_MIGRATION_TMP/post-migration.yaml"; then
    echo 'STOP: post-migration render failed' >&2
    return 1
  fi

  test -s "$POST_MIGRATION_TMP/post-migration.yaml" || return 1
  kubeconform -strict -summary -exit-on-error \
    "$POST_MIGRATION_TMP/post-migration.yaml"
}

render_post_migration_baseline
```

Expected summary: 14 valid non-secret resources.

Prove the Job is absent and workload gates remain intact:

```bash
if rg -n 'kind: Job|name: arcana-backend-migration|/app/\.venv/bin/alembic' \
  "$POST_MIGRATION_TMP/post-migration.yaml"; then
  echo 'STOP: migration hook remains in active desired state' >&2
  false
else
  echo 'Confirmed: active desired state contains no migration hook'
fi

rg -n \
  'name: arcana-(backend|frontend|celery-worker|celery-beat)$|replicas:|/app/\.venv/bin/uvicorn|image:' \
  "$POST_MIGRATION_TMP/post-migration.yaml"

git diff --check
git status --short
git diff -- apps/arcana/base/kustomization.yaml
```

Required evidence:

- No Job or Alembic command renders.
- Backend still uses Uvicorn directly.
- Backend, frontend, worker, and Beat remain at zero replicas.
- Redis remains at one replica.
- Only `apps/arcana/base/kustomization.yaml` is modified.

### 33.4 Commit and refresh without synchronizing

**Run on: current administration workstation (the company Ubuntu machine).**

```bash
git add apps/arcana/base/kustomization.yaml
git diff --cached --check
git diff --cached --stat
git status --short

git commit -m "chore: retire completed database migration hook"
git push origin main

git status --short
git rev-parse HEAD
git rev-parse origin/main
```

Only the Kustomization must be staged. After the clean matching revisions are
confirmed, request a hard refresh only:

```bash
kubectl annotate application -n argocd arcana-production \
  argocd.argoproj.io/refresh=hard \
  --overwrite
```

Wait for Argo CD to observe the retirement commit, then verify safety:

```bash
verify_hook_retirement() {
  local EXPECTED_REVISION OBSERVED_REVISION CONDITIONS
  local ACTIVE_OPERATION AUTOMATED_ENABLED LIVE_JOBS

  EXPECTED_REVISION="$(
    git -C "$HOME/Personal/arcana-deployment" rev-parse HEAD
  )" || return 1

  OBSERVED_REVISION=''
  for attempt in $(seq 1 12); do
    OBSERVED_REVISION="$(
      kubectl get application -n argocd arcana-production \
        -o jsonpath='{.status.sync.revision}'
    )" || return 1
    test "$OBSERVED_REVISION" = "$EXPECTED_REVISION" && break
    sleep 5
  done

  test "$OBSERVED_REVISION" = "$EXPECTED_REVISION" || {
    echo 'STOP: Argo CD did not render the hook-retirement commit' >&2
    return 1
  }

  CONDITIONS="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{range .status.conditions[*]}{.type}{": "}{.message}{"\n"}{end}'
  )" || return 1
  test -z "$CONDITIONS" || {
    printf '%s\n' "$CONDITIONS" >&2
    return 1
  }

  ACTIVE_OPERATION="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.operation}'
  )" || return 1
  AUTOMATED_ENABLED="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.spec.syncPolicy.automated.enabled}'
  )" || return 1
  LIVE_JOBS="$(kubectl get jobs -n arcana -o name)" || return 1

  test -z "$ACTIVE_OPERATION" || return 1
  test "$AUTOMATED_ENABLED" = false || return 1
  test -z "$LIVE_JOBS" || return 1

  echo 'Confirmed: completed migration hook is retired'
  echo 'Confirmed: no operation or Job started'
  echo 'Confirmed: automated synchronization remains disabled'
}

verify_hook_retirement
unset -f verify_hook_retirement

kubectl get deployment -n arcana \
  -o custom-columns='NAME:.metadata.name,DESIRED:.spec.replicas,READY:.status.readyReplicas'
kubectl get pods -n arcana -o wide
```

All Deployments must remain at zero and Redis must remain the only Pod. Do not
request a sync merely to remove the already-cleaned hook; no live Job exists to
prune.

### 33.5 Stop before backend activation

**Run on: no machine; this is a review checkpoint.**

The migration mechanism is now inactive, so later application syncs cannot
rerun Alembic. The next section will activate only the Kubernetes backend,
leave frontend, worker, and Beat at zero, keep public ingress on Docker, and
perform internal `/api/health/` and `/api/health/db` checks before any other
workload is activated.

## 34. Activate and smoke-test only the Kubernetes backend

Activate one backend Pod for internal testing while Docker continues serving
all public traffic. Frontend, worker, and Beat remain at zero, no Ingress is
created, and automated synchronization remains disabled.

Before activation, correct two shared configuration issues:

- Use a host-only authentication cookie by setting `AUTH_COOKIE_DOMAIN` to an
  empty string. A `.nguyenvanloc.com` cookie cannot support the separate
  `stacyn.io.vn` production domain family.
- Remove `PROMETHEUS_MULTIPROC_DIR` from the shared ConfigMap. The FastAPI
  backend uses the normal single-process Prometheus registry; worker and Beat
  already define their own multiprocess directory explicitly.

### 34.1 Recheck the retired-hook baseline

**Run on: current administration workstation (the company Ubuntu machine),
with the Section 19 SSH tunnel running.**

```bash
cd "$HOME/Personal/arcana-deployment"
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"

git status --short
git rev-parse HEAD
git rev-parse origin/main

kubectl get application -n argocd arcana-production \
  -o jsonpath='revision={.status.sync.revision}{"\n"}enabled={.spec.syncPolicy.automated.enabled}{"\n"}operation={.operation}{"\n"}'

kubectl get deployment -n arcana \
  -o custom-columns='NAME:.metadata.name,DESIRED:.spec.replicas,READY:.status.readyReplicas'
kubectl get jobs -n arcana
kubectl get pods -n arcana -o wide
```

Required results:

- Git is clean and local/remote revisions equal retirement commit
  `4db71d8e1a1f1b696f4330eeee5c84ffbfa269cc`.
- Argo CD observes the same revision, automated sync is `false`, and no
  operation is pending.
- All Deployments remain at zero, no Job exists, and Redis is the only Pod.

### 34.2 Correct backend configuration and enable one replica

**Run on: current administration workstation (the company Ubuntu machine),
from the root of `~/Personal/arcana-deployment`. This edits Git only.**

In `apps/arcana/base/backend-configmap.yaml`, replace:

```yaml
  AUTH_COOKIE_DOMAIN: .nguyenvanloc.com
```

with:

```yaml
  AUTH_COOKIE_DOMAIN: ""
```

Remove this line completely from the same ConfigMap:

```yaml
  PROMETHEUS_MULTIPROC_DIR: /tmp/prometheus-multiproc
```

Do not remove the explicit `PROMETHEUS_MULTIPROC_DIR` environment entries from
`celery-worker-deployment.yaml` or `celery-beat-deployment.yaml`.

In `apps/arcana/overlays/production/kustomization.yaml`, change only the
backend replica override from zero to one:

```yaml
replicas:
  - name: arcana-backend
    count: 1
  - name: arcana-frontend
    count: 0
  - name: arcana-celery-worker
    count: 0
  - name: arcana-celery-beat
    count: 0
```

Do not change images, register the migration Job, or alter another replica.

### 34.3 Validate the backend-only render

**Run on: current administration workstation (the company Ubuntu machine).**

```bash
kubeconform -strict -summary -exit-on-error \
  apps/arcana/base/backend-configmap.yaml \
  apps/arcana/base/backend-deployment.yaml

rg -n 'AUTH_COOKIE_DOMAIN|PROMETHEUS_MULTIPROC_DIR' \
  apps/arcana/base/backend-configmap.yaml \
  apps/arcana/base/celery-worker-deployment.yaml \
  apps/arcana/base/celery-beat-deployment.yaml
```

Expected search evidence:

- The ConfigMap contains `AUTH_COOKIE_DOMAIN: ""`.
- The ConfigMap has no `PROMETHEUS_MULTIPROC_DIR`.
- Worker and Beat each retain their explicit multiprocess setting.

Render without the Secret generator:

```bash
render_backend_activation() {
  BACKEND_RENDER_PARENT="$HOME/.cache/arcana-deployment-renders"
  mkdir -p "$BACKEND_RENDER_PARENT" || return 1
  chmod 700 "$BACKEND_RENDER_PARENT" || return 1

  BACKEND_RENDER_TMP="$(
    mktemp -d "$BACKEND_RENDER_PARENT/backend-activation.XXXXXX"
  )" || return 1
  test -d "$BACKEND_RENDER_TMP" || return 1

  mkdir -p "$BACKEND_RENDER_TMP/apps/arcana/overlays/production" \
    || return 1
  cp -R apps/arcana/base "$BACKEND_RENDER_TMP/apps/arcana/base" \
    || return 1

  sed '/^generators:/,$d' \
    apps/arcana/overlays/production/kustomization.yaml \
    >"$BACKEND_RENDER_TMP/apps/arcana/overlays/production/kustomization.yaml" \
    || return 1

  kubectl kustomize \
    "$BACKEND_RENDER_TMP/apps/arcana/overlays/production" \
    >"$BACKEND_RENDER_TMP/backend-activation.yaml" || return 1

  test -s "$BACKEND_RENDER_TMP/backend-activation.yaml" || return 1
  kubeconform -strict -summary -exit-on-error \
    "$BACKEND_RENDER_TMP/backend-activation.yaml"
}

render_backend_activation
```

Expected summary: 14 valid non-secret resources.

Inspect replicas, commands, and images:

```bash
rg -n \
  'name: arcana-(backend|frontend|celery-worker|celery-beat)$|replicas:|/app/\.venv/bin/(uvicorn|alembic)|image:' \
  "$BACKEND_RENDER_TMP/backend-activation.yaml"

if rg -n 'kind: Job|name: arcana-backend-migration|/app/\.venv/bin/alembic' \
  "$BACKEND_RENDER_TMP/backend-activation.yaml"; then
  echo 'STOP: migration hook rendered during backend activation' >&2
  false
else
  echo 'Confirmed: backend activation contains no migration hook'
fi

git diff --check
git status --short
git diff -- \
  apps/arcana/base/backend-configmap.yaml \
  apps/arcana/overlays/production/kustomization.yaml
```

Required evidence:

- Backend renders one replica and direct Uvicorn startup.
- Frontend, worker, and Beat render zero replicas.
- No Job or Alembic command renders.
- All images remain immutable.
- Git lists only the ConfigMap and production Kustomization changes.

### 34.4 Commit and render without synchronizing

**Run on: current administration workstation (the company Ubuntu machine).**

```bash
git add \
  apps/arcana/base/backend-configmap.yaml \
  apps/arcana/overlays/production/kustomization.yaml

git diff --cached --check
git diff --cached --stat
git status --short

git commit -m "feat: stage Kubernetes backend activation"
git push origin main

git status --short
git rev-parse HEAD
git rev-parse origin/main
```

Only those two files may be staged. Then hard-refresh Argo CD without starting
an operation:

```bash
kubectl annotate application -n argocd arcana-production \
  argocd.argoproj.io/refresh=hard \
  --overwrite
```

Wait for Argo CD to observe the pushed commit and confirm no render conditions,
no operation, no Job, and automated sync disabled using the same fail-closed
pattern from Section 33.4. Live Deployments must still remain at zero because
no sync has been requested yet.

### 34.5 Request the backend-only manual sync

**Run on: current administration workstation (the company Ubuntu machine).
This starts one internal Kubernetes backend Pod but does not expose it
publicly.**

Use a revision-pinned guarded function:

```bash
sync_backend_activation() {
  local EXPECTED_REVISION REMOTE_REVISION OBSERVED_REVISION
  local AUTOMATED_ENABLED ACTIVE_OPERATION LIVE_JOBS

  EXPECTED_REVISION="$(
    git -C "$HOME/Personal/arcana-deployment" rev-parse HEAD
  )" || return 1
  REMOTE_REVISION="$(
    git -C "$HOME/Personal/arcana-deployment" rev-parse origin/main
  )" || return 1
  OBSERVED_REVISION="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.status.sync.revision}'
  )" || return 1

  test "$EXPECTED_REVISION" = "$REMOTE_REVISION" \
    && test "$EXPECTED_REVISION" = "$OBSERVED_REVISION" || {
      echo 'STOP: backend activation revisions do not match' >&2
      return 1
    }

  AUTOMATED_ENABLED="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.spec.syncPolicy.automated.enabled}'
  )" || return 1
  ACTIVE_OPERATION="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.operation}'
  )" || return 1
  LIVE_JOBS="$(kubectl get jobs -n arcana -o name)" || return 1

  test "$AUTOMATED_ENABLED" = false || return 1
  test -z "$ACTIVE_OPERATION" || return 1
  test -z "$LIVE_JOBS" || return 1

  CURRENT_BACKEND_REPLICAS="$(
    kubectl get deployment -n arcana arcana-backend \
      -o jsonpath='{.spec.replicas}'
  )" || return 1
  test "$CURRENT_BACKEND_REPLICAS" = 0 || {
    echo 'STOP: live backend is not at zero before activation' >&2
    return 1
  }

  kubectl patch application -n argocd arcana-production \
    --type=merge \
    --patch "{\"operation\":{\"initiatedBy\":{\"username\":\"backend-activation-guide\"},\"sync\":{\"revision\":\"$EXPECTED_REVISION\",\"prune\":false}}}" \
    || return 1

  printf 'Requested backend activation at %s\n' "$EXPECTED_REVISION"
}

sync_backend_activation
unset -f sync_backend_activation
```

Do not run it twice. Wait for the operation using the revision-aware polling
pattern from Section 32.3. Require `Succeeded` at the exact backend activation
revision.

### 34.6 Verify rollout and configuration

**Run on: current administration workstation (the company Ubuntu machine).**

```bash
kubectl rollout status -n arcana deployment/arcana-backend --timeout=5m

kubectl get deployment -n arcana \
  -o custom-columns='NAME:.metadata.name,DESIRED:.spec.replicas,READY:.status.readyReplicas,AVAILABLE:.status.availableReplicas'
kubectl get pods -n arcana -o wide
kubectl get jobs -n arcana
kubectl get ingress -n arcana
```

Required results:

- Backend is `1/1` ready and available.
- Frontend, worker, and Beat remain at zero.
- Redis and backend are the only Arcana Pods.
- No Job and no Ingress exists.

Verify the live backend command and safe non-secret environment behavior:

```bash
kubectl get deployment -n arcana arcana-backend \
  -o jsonpath='command={.spec.template.spec.containers[0].command}{"\n"}args={.spec.template.spec.containers[0].args}{"\n"}'

kubectl exec -n arcana deployment/arcana-backend -- /bin/sh -ec '
  test -z "$AUTH_COOKIE_DOMAIN"
  test -z "${PROMETHEUS_MULTIPROC_DIR+x}"
  printf "Backend cookie and Prometheus environment are correct\n"
'
```

Expected command is `/app/.venv/bin/uvicorn`; arguments start `app:app`, and
the environment check prints its confirmation. This does not print Secret
values.

Inspect recent logs for startup failures without dumping environment:

```bash
kubectl logs -n arcana deployment/arcana-backend \
  --tail=100
```

Do not paste log lines containing tokens, URLs, email addresses, or other user
data into chat. Redact unexpected sensitive fields before sharing an error.

### 34.7 Perform internal HTTP and database smoke tests

**Run on: current administration workstation (the company Ubuntu machine).**

Open a dedicated terminal and keep this port-forward running:

```bash
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"
kubectl port-forward -n arcana service/arcana-backend \
  18000:8000
```

In a second terminal on the same Ubuntu machine:

```bash
curl --proto '=http' -fsS \
  http://127.0.0.1:18000/api/health/

curl --proto '=http' -fsS \
  http://127.0.0.1:18000/api/health/db
```

Expected JSON:

```json
{"status":"ok","message":"Application is healthy"}
{"status":"healthy","database":"connected"}
```

The database endpoint always returns HTTP 200 even when unhealthy, so the JSON
body must explicitly say `"status":"healthy"` and
`"database":"connected"`. Stop the port-forward with `Ctrl-C` afterward.

Reconfirm isolation and capacity:

```bash
kubectl get svc -n arcana
kubectl get ingress -n arcana
kubectl top pods -n arcana
kubectl top node myvps

ssh vps '
  docker ps \
    --filter name=tarot-backend \
    --filter name=tarot-frontend \
    --filter name=tarot-celery-worker \
    --filter name=tarot-celery-beat \
    --filter name=tarot-redis \
    --filter name=traefik \
    --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  df -h /
  sudo du -sh /var/lib/rancher
'
```

All Kubernetes Services remain internal, no Ingress exists, Docker production
remains running, and disk must stay above 10 GiB.

### 34.8 Stop before frontend or worker activation

**Run on: no machine; this is a review checkpoint.**

The Kubernetes backend is internal-only and receives no public traffic. Do not
activate frontend, worker, or Beat yet. Before public backend cutover, add and
review persistent avatar storage; the current backend image's `/avatar` path is
not yet backed by a Kubernetes volume. The next phase will activate and smoke-
test the frontend internally while leaving worker and Beat at zero.

## 35. Activate and smoke-test only the Kubernetes frontend

Activate one frontend Pod behind its internal ClusterIP Service. The Kubernetes
backend remains internally healthy, worker and Beat remain at zero, and Docker
Traefik continues serving every public request. This phase verifies the
frontend server and static application rendering only; it does not change DNS,
Ingress, or browser traffic.

### 35.1 Recheck the backend-only boundary

**Run on: current administration workstation (the company Ubuntu machine),
with the Section 19 SSH tunnel running.**

```bash
cd "$HOME/Personal/arcana-deployment"
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"

git status --short
git rev-parse HEAD
git rev-parse origin/main

kubectl get application -n argocd arcana-production \
  -o jsonpath='revision={.status.sync.revision}{"\n"}enabled={.spec.syncPolicy.automated.enabled}{"\n"}operation={.operation}{"\n"}'

kubectl get deployment -n arcana \
  -o custom-columns='NAME:.metadata.name,DESIRED:.spec.replicas,READY:.status.readyReplicas'
kubectl get pods -n arcana -o wide
kubectl get jobs -n arcana
kubectl get ingress -n arcana
```

Continue only when:

- Git is clean and `HEAD`, `origin/main`, and Argo CD revision match.
- Automated synchronization is `false` and `operation=` is empty.
- Backend is `1/1`; frontend, worker, and Beat are zero.
- Backend and Redis are the only Arcana Pods.
- No Job or Ingress exists.

Recheck the internal backend endpoints through a temporary port-forward if the
previous successful check is no longer recent. Do not proceed with a degraded
backend.

### 35.2 Enable one frontend replica in Git

**Run on: current administration workstation (the company Ubuntu machine),
from the root of `~/Personal/arcana-deployment`. This edits Git only.**

In `apps/arcana/overlays/production/kustomization.yaml`, change only the
frontend count from zero to one:

```yaml
replicas:
  - name: arcana-backend
    count: 1
  - name: arcana-frontend
    count: 1
  - name: arcana-celery-worker
    count: 0
  - name: arcana-celery-beat
    count: 0
```

Do not change any image, register the migration Job, enable worker or Beat, or
add an Ingress.

### 35.3 Validate the frontend activation render

**Run on: current administration workstation (the company Ubuntu machine).**

```bash
kubeconform -strict -summary -exit-on-error \
  apps/arcana/base/frontend-deployment.yaml \
  apps/arcana/base/frontend-service.yaml

render_frontend_activation() {
  FRONTEND_RENDER_PARENT="$HOME/.cache/arcana-deployment-renders"
  mkdir -p "$FRONTEND_RENDER_PARENT" || return 1
  chmod 700 "$FRONTEND_RENDER_PARENT" || return 1

  FRONTEND_RENDER_TMP="$(
    mktemp -d "$FRONTEND_RENDER_PARENT/frontend-activation.XXXXXX"
  )" || return 1
  test -d "$FRONTEND_RENDER_TMP" || return 1

  mkdir -p "$FRONTEND_RENDER_TMP/apps/arcana/overlays/production" \
    || return 1
  cp -R apps/arcana/base "$FRONTEND_RENDER_TMP/apps/arcana/base" \
    || return 1

  sed '/^generators:/,$d' \
    apps/arcana/overlays/production/kustomization.yaml \
    >"$FRONTEND_RENDER_TMP/apps/arcana/overlays/production/kustomization.yaml" \
    || return 1

  kubectl kustomize \
    "$FRONTEND_RENDER_TMP/apps/arcana/overlays/production" \
    >"$FRONTEND_RENDER_TMP/frontend-activation.yaml" || return 1

  test -s "$FRONTEND_RENDER_TMP/frontend-activation.yaml" || return 1
  kubeconform -strict -summary -exit-on-error \
    "$FRONTEND_RENDER_TMP/frontend-activation.yaml"
}

render_frontend_activation
```

Expected results are two valid frontend resources and 14 valid non-secret
production resources.

Inspect gates, images, and forbidden exposure:

```bash
rg -n \
  'name: arcana-(backend|frontend|celery-worker|celery-beat)$|replicas:|image:|type: (NodePort|LoadBalancer)' \
  "$FRONTEND_RENDER_TMP/frontend-activation.yaml"

if rg -n \
  'kind: Job|name: arcana-backend-migration|/app/\.venv/bin/alembic|kind: Ingress|type: (NodePort|LoadBalancer)' \
  "$FRONTEND_RENDER_TMP/frontend-activation.yaml"; then
  echo 'STOP: forbidden migration or public exposure rendered' >&2
  false
else
  echo 'Confirmed: frontend activation is internal and migration-free'
fi

git diff --check
git status --short
git diff -- apps/arcana/overlays/production/kustomization.yaml
```

Required evidence:

- Backend and frontend render one replica each.
- Worker and Beat render zero.
- Backend and frontend images retain the immutable SHA.
- No Job, Alembic command, Ingress, NodePort, or LoadBalancer renders.
- Only the production Kustomization is modified.

### 35.4 Commit, push, and refresh without synchronizing

**Run on: current administration workstation (the company Ubuntu machine).**

```bash
git add apps/arcana/overlays/production/kustomization.yaml
git diff --cached --check
git diff --cached --stat
git status --short

git commit -m "feat: stage Kubernetes frontend activation"
git push origin main

git status --short
git rev-parse HEAD
git rev-parse origin/main
```

Only the production Kustomization may be staged. Hard-refresh without starting
an operation:

```bash
kubectl annotate application -n argocd arcana-production \
  argocd.argoproj.io/refresh=hard \
  --overwrite
```

Wait for Argo CD to observe the pushed revision. Require no render conditions,
no `.operation`, no Job, and automated synchronization `false`. The live
frontend must remain at zero until the manual sync is requested.

### 35.5 Request the frontend-only manual sync

**Run on: current administration workstation (the company Ubuntu machine).
This starts one internal frontend Pod but creates no public route.**

```bash
sync_frontend_activation() {
  local EXPECTED_REVISION REMOTE_REVISION OBSERVED_REVISION
  local AUTOMATED_ENABLED ACTIVE_OPERATION LIVE_JOBS
  local BACKEND_REPLICAS FRONTEND_REPLICAS WORKER_REPLICAS BEAT_REPLICAS

  EXPECTED_REVISION="$(
    git -C "$HOME/Personal/arcana-deployment" rev-parse HEAD
  )" || return 1
  REMOTE_REVISION="$(
    git -C "$HOME/Personal/arcana-deployment" rev-parse origin/main
  )" || return 1
  OBSERVED_REVISION="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.status.sync.revision}'
  )" || return 1

  test "$EXPECTED_REVISION" = "$REMOTE_REVISION" \
    && test "$EXPECTED_REVISION" = "$OBSERVED_REVISION" || {
      echo 'STOP: frontend activation revisions do not match' >&2
      return 1
    }

  AUTOMATED_ENABLED="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.spec.syncPolicy.automated.enabled}'
  )" || return 1
  ACTIVE_OPERATION="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.operation}'
  )" || return 1
  LIVE_JOBS="$(kubectl get jobs -n arcana -o name)" || return 1

  test "$AUTOMATED_ENABLED" = false || return 1
  test -z "$ACTIVE_OPERATION" || return 1
  test -z "$LIVE_JOBS" || return 1

  BACKEND_REPLICAS="$(kubectl get deployment -n arcana arcana-backend -o jsonpath='{.spec.replicas}')" || return 1
  FRONTEND_REPLICAS="$(kubectl get deployment -n arcana arcana-frontend -o jsonpath='{.spec.replicas}')" || return 1
  WORKER_REPLICAS="$(kubectl get deployment -n arcana arcana-celery-worker -o jsonpath='{.spec.replicas}')" || return 1
  BEAT_REPLICAS="$(kubectl get deployment -n arcana arcana-celery-beat -o jsonpath='{.spec.replicas}')" || return 1

  test "$BACKEND_REPLICAS" = 1 \
    && test "$FRONTEND_REPLICAS" = 0 \
    && test "$WORKER_REPLICAS" = 0 \
    && test "$BEAT_REPLICAS" = 0 || {
      echo 'STOP: live workload boundary is not backend-only' >&2
      return 1
    }

  kubectl patch application -n argocd arcana-production \
    --type=merge \
    --patch "{\"operation\":{\"initiatedBy\":{\"username\":\"frontend-activation-guide\"},\"sync\":{\"revision\":\"$EXPECTED_REVISION\",\"prune\":false}}}" \
    || return 1

  printf 'Requested frontend activation at %s\n' "$EXPECTED_REVISION"
}

sync_frontend_activation
unset -f sync_frontend_activation
```

Run it once. Wait for `Succeeded` at the exact frontend activation revision
using the revision-aware polling pattern from Section 32.3.

### 35.6 Verify frontend rollout and isolation

**Run on: current administration workstation (the company Ubuntu machine).**

```bash
kubectl rollout status -n arcana deployment/arcana-frontend --timeout=5m

kubectl get deployment -n arcana \
  -o custom-columns='NAME:.metadata.name,DESIRED:.spec.replicas,READY:.status.readyReplicas,AVAILABLE:.status.availableReplicas'
kubectl get pods -n arcana -o wide
kubectl get jobs -n arcana
kubectl get ingress -n arcana
kubectl get svc -n arcana
```

Required results:

- Backend and frontend are each `1/1` ready.
- Worker and Beat remain zero.
- Redis, backend, and frontend are the only Arcana Pods.
- No Job or Ingress exists and every Service remains internal.

Verify the frontend security and writable-volume contract without printing
environment values:

```bash
kubectl get deployment -n arcana arcana-frontend \
  -o jsonpath='runAsUser={.spec.template.spec.securityContext.runAsUser}{"\n"}readOnlyRoot={.spec.template.spec.containers[0].securityContext.readOnlyRootFilesystem}{"\n"}{range .spec.template.spec.containers[0].volumeMounts[*]}mount={.mountPath}{"\n"}{end}'
```

Expected values are UID `1000`, `readOnlyRoot=true`, and mounts at
`/app/.next/cache` and `/tmp`.

Review recent logs without posting user data or unexpected tokens:

```bash
kubectl logs -n arcana deployment/arcana-frontend --tail=100
```

### 35.7 Smoke-test frontend rendering through a local port-forward

**Run on: current administration workstation (the company Ubuntu machine).**

In a dedicated terminal:

```bash
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"
kubectl port-forward -n arcana service/arcana-frontend \
  13000:3000
```

In a second terminal while the port-forward remains running:

```bash
curl --proto '=http' -sS \
  -D - \
  -o /dev/null \
  http://127.0.0.1:13000/

curl --proto '=http' -L --max-redirs 5 -fsS \
  -o /dev/null \
  -w 'final_status=%{http_code} final_url=%{url_effective} content_type=%{content_type}\n' \
  http://127.0.0.1:13000/

curl --proto '=http' -L --max-redirs 5 -fsS \
  http://127.0.0.1:13000/ \
  | rg -i -m1 '<!doctype html|<html'
```

The initial request may return the application's expected HTTP 307 redirect;
record and inspect its `Location` header. The followed request must end at an
expected application route with HTTP 200, an HTML content type, and an HTML
document marker. Kubernetes HTTP probes treat status codes from 200 through
399 as successful, so the expected redirect does not make the Pod unhealthy.
Stop the port-forward with `Ctrl-C` afterward.

This localhost smoke test proves the Next.js server renders; it does not prove
browser API routing for production hostnames. That will be tested later with
explicit host routing before public cutover.

Reconfirm capacity and Docker production:

```bash
kubectl top pods -n arcana
kubectl top node myvps

ssh vps '
  docker ps \
    --filter name=tarot-backend \
    --filter name=tarot-frontend \
    --filter name=tarot-celery-worker \
    --filter name=tarot-celery-beat \
    --filter name=tarot-redis \
    --filter name=traefik \
    --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  df -h /
  sudo du -sh /var/lib/rancher
'
```

### 35.8 Stop before worker activation

**Run on: no machine; this is a review checkpoint.**

The Kubernetes frontend and backend remain internal-only. Do not activate
worker or Beat yet. The next phase will activate only one concurrency-one
worker, confirm Redis broker connectivity and registered task queues, and avoid
submitting production tasks during the smoke test. Kubernetes Beat remains at
zero until the Docker Beat cutover.

## 36. Activate and smoke-test one Kubernetes Celery worker

Activate one concurrency-one worker against the Kubernetes Redis broker. The
worker uses the production database credentials but receives no public API
traffic and has no Kubernetes Beat scheduler producing periodic tasks. The
smoke test uses Celery control commands only and must not enqueue an application
task.

The existing Docker worker continues serving the Docker Redis broker. Because
the Docker and Kubernetes brokers are separate Redis instances, the two workers
do not compete for the same queues during this internal staging phase.

### 36.1 Recheck the frontend/backend boundary

**Run on: current administration workstation (the company Ubuntu machine),
with the Section 19 SSH tunnel running.**

```bash
cd "$HOME/Personal/arcana-deployment"
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"

git status --short
git rev-parse HEAD
git rev-parse origin/main

kubectl get application -n argocd arcana-production \
  -o jsonpath='revision={.status.sync.revision}{"\n"}enabled={.spec.syncPolicy.automated.enabled}{"\n"}operation={.operation}{"\n"}'

kubectl get deployment -n arcana \
  -o custom-columns='NAME:.metadata.name,DESIRED:.spec.replicas,READY:.status.readyReplicas'
kubectl get pods -n arcana -o wide
kubectl get jobs -n arcana
kubectl get ingress -n arcana
```

Continue only when Git and Argo CD revisions match, automated sync is `false`,
no operation or Job exists, backend and frontend are each `1/1`, worker and
Beat are zero, Redis/backend/frontend are the only Pods, and no Ingress exists.

Recheck capacity and Docker production:

```bash
kubectl top node myvps

ssh vps '
  docker ps \
    --filter name=tarot-backend \
    --filter name=tarot-frontend \
    --filter name=tarot-celery-worker \
    --filter name=tarot-celery-beat \
    --filter name=tarot-redis \
    --filter name=traefik \
    --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  df -h /
  sudo du -sh /var/lib/rancher
'
```

Disk must remain above 10 GiB and Docker production must be unchanged.

### 36.2 Enable one worker replica in Git

**Run on: current administration workstation (the company Ubuntu machine),
from the root of `~/Personal/arcana-deployment`. This edits Git only.**

In `apps/arcana/overlays/production/kustomization.yaml`, change only the worker
count from zero to one:

```yaml
replicas:
  - name: arcana-backend
    count: 1
  - name: arcana-frontend
    count: 1
  - name: arcana-celery-worker
    count: 1
  - name: arcana-celery-beat
    count: 0
```

Do not change images, register the migration Job, activate Beat, or add public
exposure.

### 36.3 Validate the worker activation render

**Run on: current administration workstation (the company Ubuntu machine).**

```bash
kubeconform -strict -summary -exit-on-error \
  apps/arcana/base/celery-worker-deployment.yaml \
  apps/arcana/base/celery-worker-service.yaml

render_worker_activation() {
  WORKER_RENDER_PARENT="$HOME/.cache/arcana-deployment-renders"
  mkdir -p "$WORKER_RENDER_PARENT" || return 1
  chmod 700 "$WORKER_RENDER_PARENT" || return 1

  WORKER_RENDER_TMP="$(
    mktemp -d "$WORKER_RENDER_PARENT/worker-activation.XXXXXX"
  )" || return 1
  test -d "$WORKER_RENDER_TMP" || return 1

  mkdir -p "$WORKER_RENDER_TMP/apps/arcana/overlays/production" \
    || return 1
  cp -R apps/arcana/base "$WORKER_RENDER_TMP/apps/arcana/base" \
    || return 1

  sed '/^generators:/,$d' \
    apps/arcana/overlays/production/kustomization.yaml \
    >"$WORKER_RENDER_TMP/apps/arcana/overlays/production/kustomization.yaml" \
    || return 1

  kubectl kustomize \
    "$WORKER_RENDER_TMP/apps/arcana/overlays/production" \
    >"$WORKER_RENDER_TMP/worker-activation.yaml" || return 1

  test -s "$WORKER_RENDER_TMP/worker-activation.yaml" || return 1
  kubeconform -strict -summary -exit-on-error \
    "$WORKER_RENDER_TMP/worker-activation.yaml"
}

render_worker_activation
```

Expected results are two valid worker resources and 14 valid non-secret
production resources.

Inspect the worker contract and workload gates:

```bash
rg -n \
  'name: arcana-(backend|frontend|celery-worker|celery-beat)$|replicas:|/app/\.venv/bin/(celery|alembic|uvicorn)|--queues=|--concurrency=|PROMETHEUS_MULTIPROC_DIR|image:' \
  "$WORKER_RENDER_TMP/worker-activation.yaml"

if rg -n \
  'kind: Job|name: arcana-backend-migration|/app/\.venv/bin/alembic|kind: Ingress|type: (NodePort|LoadBalancer)' \
  "$WORKER_RENDER_TMP/worker-activation.yaml"; then
  echo 'STOP: forbidden migration or public exposure rendered' >&2
  false
else
  echo 'Confirmed: worker activation is internal and migration-free'
fi

git diff --check
git status --short
git diff -- apps/arcana/overlays/production/kustomization.yaml
```

Required evidence:

- Backend, frontend, and worker render one replica; Beat renders zero.
- Worker uses the immutable backend image.
- Worker command is `/app/.venv/bin/celery` with queues
  `email,notifications,celery,dead_letter` and concurrency one.
- Its multiprocess metrics directory remains explicit.
- No Job, Alembic command, Ingress, NodePort, or LoadBalancer renders.
- Only the production Kustomization is modified.

### 36.4 Commit, push, and refresh without synchronizing

**Run on: current administration workstation (the company Ubuntu machine).**

```bash
git add apps/arcana/overlays/production/kustomization.yaml
git diff --cached --check
git diff --cached --stat
git status --short

git commit -m "feat: stage Kubernetes Celery worker activation"
git push origin main

git status --short
git rev-parse HEAD
git rev-parse origin/main
```

Only the production Kustomization may be staged. Hard-refresh Argo CD without
starting an operation:

```bash
kubectl annotate application -n argocd arcana-production \
  argocd.argoproj.io/refresh=hard \
  --overwrite
```

Wait for Argo CD to observe the pushed revision. Require no render conditions,
no `.operation`, no Job, and automated synchronization `false`. The live
worker must remain at zero until the manual sync.

### 36.5 Request the worker-only manual sync

**Run on: current administration workstation (the company Ubuntu machine).
This starts one internal worker and does not submit a task.**

```bash
sync_worker_activation() {
  local EXPECTED_REVISION REMOTE_REVISION OBSERVED_REVISION
  local AUTOMATED_ENABLED ACTIVE_OPERATION LIVE_JOBS
  local BACKEND_REPLICAS FRONTEND_REPLICAS WORKER_REPLICAS BEAT_REPLICAS

  EXPECTED_REVISION="$(
    git -C "$HOME/Personal/arcana-deployment" rev-parse HEAD
  )" || return 1
  REMOTE_REVISION="$(
    git -C "$HOME/Personal/arcana-deployment" rev-parse origin/main
  )" || return 1
  OBSERVED_REVISION="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.status.sync.revision}'
  )" || return 1

  test "$EXPECTED_REVISION" = "$REMOTE_REVISION" \
    && test "$EXPECTED_REVISION" = "$OBSERVED_REVISION" || {
      echo 'STOP: worker activation revisions do not match' >&2
      return 1
    }

  AUTOMATED_ENABLED="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.spec.syncPolicy.automated.enabled}'
  )" || return 1
  ACTIVE_OPERATION="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.operation}'
  )" || return 1
  LIVE_JOBS="$(kubectl get jobs -n arcana -o name)" || return 1

  test "$AUTOMATED_ENABLED" = false || return 1
  test -z "$ACTIVE_OPERATION" || return 1
  test -z "$LIVE_JOBS" || return 1

  BACKEND_REPLICAS="$(kubectl get deployment -n arcana arcana-backend -o jsonpath='{.spec.replicas}')" || return 1
  FRONTEND_REPLICAS="$(kubectl get deployment -n arcana arcana-frontend -o jsonpath='{.spec.replicas}')" || return 1
  WORKER_REPLICAS="$(kubectl get deployment -n arcana arcana-celery-worker -o jsonpath='{.spec.replicas}')" || return 1
  BEAT_REPLICAS="$(kubectl get deployment -n arcana arcana-celery-beat -o jsonpath='{.spec.replicas}')" || return 1

  test "$BACKEND_REPLICAS" = 1 \
    && test "$FRONTEND_REPLICAS" = 1 \
    && test "$WORKER_REPLICAS" = 0 \
    && test "$BEAT_REPLICAS" = 0 || {
      echo 'STOP: live boundary is not ready for worker activation' >&2
      return 1
    }

  kubectl patch application -n argocd arcana-production \
    --type=merge \
    --patch "{\"operation\":{\"initiatedBy\":{\"username\":\"worker-activation-guide\"},\"sync\":{\"revision\":\"$EXPECTED_REVISION\",\"prune\":false}}}" \
    || return 1

  printf 'Requested worker activation at %s\n' "$EXPECTED_REVISION"
}

sync_worker_activation
unset -f sync_worker_activation
```

Run it once. Wait for `Succeeded` at the exact worker activation revision using
the revision-aware polling pattern from Section 32.3.

### 36.6 Verify rollout and broker connectivity

**Run on: current administration workstation (the company Ubuntu machine).**

```bash
kubectl rollout status -n arcana \
  deployment/arcana-celery-worker \
  --timeout=5m

kubectl get deployment -n arcana \
  -o custom-columns='NAME:.metadata.name,DESIRED:.spec.replicas,READY:.status.readyReplicas,AVAILABLE:.status.availableReplicas'
kubectl get pods -n arcana -o wide
kubectl get jobs -n arcana
kubectl get ingress -n arcana
```

Required results:

- Backend, frontend, and worker are each `1/1` ready.
- Beat remains zero.
- Redis, backend, frontend, and worker are the only Arcana Pods.
- No Job or Ingress exists.

Verify the worker command and init-container completion:

```bash
kubectl get deployment -n arcana arcana-celery-worker \
  -o jsonpath='command={.spec.template.spec.containers[0].command}{"\n"}args={.spec.template.spec.containers[0].args}{"\n"}'

kubectl get pod -n arcana \
  -l app.kubernetes.io/name=arcana-celery-worker \
  -o jsonpath='{range .items[*]}pod={.metadata.name}{"\n"}{range .status.initContainerStatuses[*]}init={.name} terminated={.state.terminated.reason} exit={.state.terminated.exitCode}{"\n"}{end}{end}'
```

Expected command is Celery with the four reviewed queues and concurrency one;
`wait-for-redis` must show `Completed` and exit zero.

Use Celery control commands only. They exchange worker-control messages but do
not enqueue application tasks:

```bash
kubectl exec -n arcana deployment/arcana-celery-worker -- \
  /app/.venv/bin/celery -A celery_app inspect ping --timeout=10

kubectl exec -n arcana deployment/arcana-celery-worker -- \
  /app/.venv/bin/celery -A celery_app inspect registered --timeout=10

kubectl exec -n arcana deployment/arcana-celery-worker -- \
  /app/.venv/bin/celery -A celery_app inspect active --timeout=10

kubectl exec -n arcana deployment/arcana-celery-worker -- \
  /app/.venv/bin/celery -A celery_app inspect reserved --timeout=10

kubectl exec -n arcana deployment/arcana-celery-worker -- \
  /app/.venv/bin/celery -A celery_app inspect scheduled --timeout=10
```

Required evidence:

- `ping` receives one `pong` from the Kubernetes worker.
- Registered output includes the expected email, notification, journal, web
  push, and dead-letter task modules.
- Active, reserved, and scheduled contain no application tasks.

Do not run `celery call`, `delay`, `apply_async`, or an API action that submits
a task during this smoke test.

### 36.7 Verify internal metrics and steady state

**Run on: current administration workstation (the company Ubuntu machine).**

In a dedicated terminal:

```bash
kubectl port-forward -n arcana \
  service/arcana-celery-worker-metrics \
  18001:8001
```

In a second terminal while the port-forward remains active:

```bash
curl --proto '=http' -fsS -o /dev/null \
  -w 'status=%{http_code} content_type=%{content_type}\n' \
  http://127.0.0.1:18001/metrics
```

Expected result is HTTP 200 with a Prometheus text content type. Stop the
port-forward with `Ctrl-C` afterward.

Review recent logs, then recheck capacity and Docker production:

```bash
kubectl logs -n arcana deployment/arcana-celery-worker \
  --tail=150

kubectl top pods -n arcana
kubectl top node myvps

ssh vps '
  docker ps \
    --filter name=tarot-backend \
    --filter name=tarot-frontend \
    --filter name=tarot-celery-worker \
    --filter name=tarot-celery-beat \
    --filter name=tarot-redis \
    --filter name=traefik \
    --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  df -h /
  sudo du -sh /var/lib/rancher
'
```

Redact unexpected sensitive log fields before sharing them. Disk must remain
above 10 GiB, node capacity must remain healthy, and Docker must remain
unchanged.

### 36.8 Remediate the worker's root execution

The first worker rollout was functionally healthy but Celery emitted:

```text
SecurityWarning: You're running the worker with superuser privileges
uid=0 euid=0 gid=0 egid=0
```

Do not accept that warning for the Kubernetes workload. The pinned backend
image has no passwd/group entry for numeric UID/GID 1000, so Celery treats that
unresolvable identity as potentially privileged. Run the worker as the image's
existing `nobody:nogroup` UID/GID 65534 and use Pod `fsGroup` ownership for its
writable Prometheus multiprocess `emptyDir`. A future backend image should
replace this generic account with a dedicated named application account.

#### Update and validate the worker security context

**Run on: current administration workstation (the company Ubuntu machine),
from the root of `~/Personal/arcana-deployment`. This edits Git only.**

In `apps/arcana/base/celery-worker-deployment.yaml`, add this Pod-level
`securityContext` immediately under the Pod template's `spec`, before
`initContainers`:

```yaml
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 65534
        runAsGroup: 65534
        fsGroup: 65534
        fsGroupChangePolicy: OnRootMismatch
        seccompProfile:
          type: RuntimeDefault

      initContainers:
```

Keep the existing container-level capability drop and seccomp controls. The
Pod setting also applies to `wait-for-redis`; the Redis image's `redis-cli`
does not require root.

Validate source and rendered security:

```bash
kubeconform -strict -summary -exit-on-error \
  apps/arcana/base/celery-worker-deployment.yaml

kubectl kustomize apps/arcana/base \
  | kubeconform -strict -summary -exit-on-error

rg -n \
  'runAsNonRoot|runAsUser|runAsGroup|fsGroup|fsGroupChangePolicy|allowPrivilegeEscalation|drop:|seccompProfile' \
  apps/arcana/base/celery-worker-deployment.yaml

git diff --check
git status --short
git diff -- apps/arcana/base/celery-worker-deployment.yaml
```

Only the worker Deployment may be modified. Required values are UID/GID/fsGroup
65534, non-root enabled, `OnRootMismatch`, privilege escalation disabled, all
capabilities dropped, and RuntimeDefault seccomp.

#### Commit, refresh, and synchronize the remediation

**Run on: current administration workstation (the company Ubuntu machine).**

```bash
git add apps/arcana/base/celery-worker-deployment.yaml
git diff --cached --check
git diff --cached --stat
git status --short

git commit -m "fix: run Kubernetes Celery worker as non-root"
git push origin main

git status --short
git rev-parse HEAD
git rev-parse origin/main
```

Hard-refresh Argo CD and wait for the pushed revision without synchronizing:

```bash
kubectl annotate application -n argocd arcana-production \
  argocd.argoproj.io/refresh=hard \
  --overwrite
```

Require the matching revision, no render conditions, no operation, no Job, and
automated synchronization `false`. Then request one revision-pinned manual sync
using the same guards as Section 36.5, except the live boundary must now be
backend/frontend/worker at one and Beat at zero. Keep pruning disabled.

Wait for `Succeeded` at the exact remediation revision, then:

```bash
kubectl rollout status -n arcana \
  deployment/arcana-celery-worker \
  --timeout=5m

kubectl exec -n arcana deployment/arcana-celery-worker -- id

kubectl get pod -n arcana \
  -l app.kubernetes.io/name=arcana-celery-worker \
  -o jsonpath='{range .items[*]}pod={.metadata.name}{"\n"}{range .status.initContainerStatuses[*]}init={.name} reason={.state.terminated.reason} exit={.state.terminated.exitCode}{"\n"}{end}{end}'

kubectl logs -n arcana deployment/arcana-celery-worker \
  --tail=150
```

Required evidence:

- `id` reports `uid=65534(nobody) gid=65534(nogroup)`.
- `wait-for-redis` completes with exit zero.
- Worker reaches the ready state and no superuser warning appears in the new
  Pod's logs.

Repeat the Section 36.6 `inspect ping`, `registered`, `active`, `reserved`, and
`scheduled` commands. Require one pong, expected registered tasks, and no
active/reserved/scheduled tasks. Repeat the metrics HTTP 200 check and capacity
checks from Section 36.7.

### 36.9 Stop before Beat or public cutover

**Run on: no machine; this is a review checkpoint.**

The worker is connected to the isolated Kubernetes broker but has processed no
application tasks. Do not activate Kubernetes Beat while Docker Beat runs.
Before any public cutover, add persistent avatar storage and decide how existing
avatar data will be migrated. The next phase should address that data path
before scheduler or ingress changes.

## 37. Inventory persistent avatar data before storage staging

The production backend writes avatar files to `/avatar`, while the `users`
table stores only their filenames. Docker Compose bind-mounts the same host
directory into the backend, worker, and Beat containers. The Kubernetes
backend currently has no `/avatar` mount, so uploads through it would be written
into ephemeral container storage and lost when the Pod is replaced.

This section is observation-only. Do not upload or delete an avatar through the
Kubernetes backend, create a PVC, copy data, or change public routing yet.

### 37.1 Reconfirm the migration boundary

**Run on: current administration workstation (the company Ubuntu machine).**

```bash
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"

kubectl get deployment -n arcana \
  -o custom-columns='NAME:.metadata.name,DESIRED:.spec.replicas,READY:.status.readyReplicas'
kubectl get jobs -n arcana
kubectl get ingress -n arcana

kubectl exec -n arcana deployment/arcana-celery-worker -- id

kubectl get application -n argocd arcana-production \
  -o jsonpath='revision={.status.sync.revision}{"\n"}enabled={.spec.syncPolicy.automated.enabled}{"\n"}operation={.operation}{"\n"}'
```

Require backend, frontend, and worker at one replica; Beat at zero; no Job; no
Ingress; worker identity `nobody:nogroup`; automated synchronization `false`;
and no active operation.

### 37.2 Resolve and inventory the Docker avatar source

**Run on: VPS, through `ssh vps` from the current administration workstation.**

The following block resolves the bind-mount source from Docker metadata. It
refuses an empty path, a non-directory, or a symbolic link and prints only
aggregate file information—not avatar filenames:

```bash
ssh vps '
  set -eu

  AVATAR_SOURCE="$(
    docker inspect tarot-backend \
      --format "{{range .Mounts}}{{if eq .Destination \"/avatar\"}}{{.Source}}{{end}}{{end}}"
  )"

  test -n "$AVATAR_SOURCE" || {
    echo "STOP: Docker backend has no /avatar mount" >&2
    exit 1
  }
  test "${AVATAR_SOURCE#/}" != "$AVATAR_SOURCE" || {
    echo "STOP: avatar source is not absolute" >&2
    exit 1
  }
  test -d "$AVATAR_SOURCE" || {
    echo "STOP: avatar source is not a directory" >&2
    exit 1
  }
  test ! -L "$AVATAR_SOURCE" || {
    echo "STOP: avatar source is a symbolic link" >&2
    exit 1
  }

  printf "source=%s\n" "$AVATAR_SOURCE"
  stat -c "owner=%u:%g mode=%a filesystem=%m" "$AVATAR_SOURCE"
  printf "regular_files="
  find "$AVATAR_SOURCE" -xdev -type f -printf . | wc -c
  printf "bytes="
  find "$AVATAR_SOURCE" -xdev -type f -printf "%s\n" \
    | awk "{ total += \$1 } END { print total + 0 }"

  for CONTAINER in tarot-backend tarot-celery-worker tarot-celery-beat; do
    SOURCE="$(
      docker inspect "$CONTAINER" \
        --format "{{range .Mounts}}{{if eq .Destination \"/avatar\"}}{{.Source}}{{end}}{{end}}"
    )"
    test "$SOURCE" = "$AVATAR_SOURCE" || {
      echo "STOP: $CONTAINER uses a different avatar source" >&2
      exit 1
    }
    printf "%s=/avatar<-same-source\n" "$CONTAINER"
  done
'
```

Record the source path, owner/mode, regular-file count, and byte total. Do not
change its permissions or ownership.

### 37.3 Count database references without exposing filenames

**Run on: VPS, through `ssh vps` from the current administration workstation.**

Use the already-running Docker backend and its existing database environment.
This query prints only a count:

```bash
ssh vps 'docker exec tarot-backend /app/.venv/bin/python -c \
"from database import SessionLocal; from models import User; db = SessionLocal(); print(\"avatar_database_references=%d\" % db.query(User).filter(User.avatar_filename.isnot(None)).count()); db.close()"'
```

Do not print `avatar_filename`, user records, environment variables, or the
database URL. Record only `avatar_database_references`.

The file count and database-reference count need not be equal: old files may
be orphaned, and missing files may still be referenced. Any mismatch is a
reconciliation input, not permission to delete anything.

### 37.4 Confirm Kubernetes has no persistent avatar mount

**Run on: current administration workstation (the company Ubuntu machine).**

```bash
kubectl get deployment -n arcana arcana-backend \
  -o jsonpath='{range .spec.template.spec.containers[0].volumeMounts[*]}{.name}{"\t"}{.mountPath}{"\n"}{end}'

kubectl get pvc -n arcana
```

Require no `/avatar` mount on the backend. Existing Redis and Beat claims are
unrelated and must not be reused for avatars.

### 37.5 Stop before creating or populating avatar storage

**Run on: no machine; this is a review checkpoint.**

Keep Docker as the sole public writer. The next section should create a
dedicated retained `local-path` PVC, mount it only into the Kubernetes backend,
verify UID/GID write access without exposing it publicly, and copy a snapshot
of the Docker avatar directory into the claim without deleting or modifying the
source. A final short delta copy is still required immediately before public
cutover because Docker users may upload avatars after the initial snapshot.

Do not mount the avatar claim into the Kubernetes worker or Beat unless code
inspection identifies a task that actually reads or writes avatar files.

## 38. Stage dedicated persistent avatar storage

This section creates a dedicated 1 GiB `local-path` claim and mounts it only at
the Kubernetes backend's `/avatar` path. It does not copy production data or
change public routing. The claim is protected from Argo CD pruning, but that
annotation is not a backup: manually deleting the PVC can still delete its
local-path volume.

### 38.1 Author the avatar claim and backend mount

**Run on: current administration workstation (the company Ubuntu machine),
from the root of `~/Personal/arcana-deployment`. This edits Git only.**

Create `apps/arcana/base/backend-avatar-pvc.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: arcana-backend-avatars
  annotations:
    argocd.argoproj.io/sync-options: Prune=false
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 1Gi
```

Register it in `apps/arcana/base/kustomization.yaml` immediately before
`backend-deployment.yaml`:

```yaml
  - backend-avatar-pvc.yaml
  - backend-deployment.yaml
```

In `apps/arcana/base/backend-deployment.yaml`, add this mount to the `backend`
container before its probes:

```yaml
          volumeMounts:
            - name: avatars
              mountPath: /avatar
```

Add the corresponding Pod volume after the `containers` list and before
`terminationGracePeriodSeconds`:

```yaml
      volumes:
        - name: avatars
          persistentVolumeClaim:
            claimName: arcana-backend-avatars

      terminationGracePeriodSeconds: 30
```

Do not mount this claim into worker, Beat, frontend, migration Job, or Redis.

### 38.2 Validate the storage-only desired state

**Run on: current administration workstation (the company Ubuntu machine).**

```bash
kubeconform -strict -summary -exit-on-error \
  apps/arcana/base/backend-avatar-pvc.yaml \
  apps/arcana/base/backend-deployment.yaml

kubectl kustomize apps/arcana/base \
  | kubeconform -strict -summary -exit-on-error

rg -n \
  'arcana-backend-avatars|mountPath: /avatar|Prune=false|storage: 1Gi' \
  apps/arcana/base/backend-avatar-pvc.yaml \
  apps/arcana/base/backend-deployment.yaml \
  apps/arcana/base/kustomization.yaml

if rg -n 'arcana-backend-avatars|mountPath: /avatar' \
  apps/arcana/base/celery-worker-deployment.yaml \
  apps/arcana/base/celery-beat-deployment.yaml \
  apps/arcana/base/frontend-deployment.yaml \
  apps/arcana/base/backend-migration-job.yaml; then
  echo 'STOP: avatar storage is mounted outside the backend' >&2
  false
else
  echo 'Confirmed: only the backend declares avatar storage'
fi

git diff --check
git status --short
git diff -- \
  apps/arcana/base/backend-avatar-pvc.yaml \
  apps/arcana/base/backend-deployment.yaml \
  apps/arcana/base/kustomization.yaml
```

Require exactly those three intended files, a valid render, one 1 GiB claim,
one `/avatar` mount, and no migration Job.

### 38.3 Commit, push, and refresh without synchronizing

**Run on: current administration workstation (the company Ubuntu machine).**

```bash
git add \
  apps/arcana/base/backend-avatar-pvc.yaml \
  apps/arcana/base/backend-deployment.yaml \
  apps/arcana/base/kustomization.yaml

git diff --cached --check
git diff --cached --stat
git status --short

git commit -m "feat: add persistent Kubernetes avatar storage"
git push origin main

git status --short
git rev-parse HEAD
git rev-parse origin/main

kubectl annotate application -n argocd arcana-production \
  argocd.argoproj.io/refresh=hard \
  --overwrite
```

Wait for Argo CD to observe the pushed revision. Require no conditions, no
active operation, automated synchronization `false`, and `OutOfSync` resources
limited to the new PVC and backend Deployment. Confirm the live claim is still
absent before authorizing synchronization:

```bash
kubectl get pvc -n arcana arcana-backend-avatars --ignore-not-found -o name
```

An empty result is required.

### 38.4 Request the revision-pinned storage sync

**Run on: current administration workstation (the company Ubuntu machine).**

Use the guarded manual-sync function from Section 36.5 with a distinct
initiator, `avatar-storage-guide`. Its live boundary must require backend,
frontend, and worker at one replica and Beat at zero. It must additionally
require the avatar PVC to be absent before issuing the operation. Keep pruning
disabled and synchronize the exact matching `HEAD`, `origin/main`, and rendered
Argo CD revision.

Do not reuse the original worker-activation guard: that obsolete guard expects
the worker at zero.

After the operation reports `Succeeded`, verify the rollout and empty claim:

```bash
verify_avatar_storage() {
  local PVC_PHASE MOUNTS CLAIM_NAME LIVE_JOBS LIVE_INGRESSES

  kubectl rollout status -n arcana deployment/arcana-backend \
    --timeout=5m || return 1

  PVC_PHASE="$(
    kubectl get pvc -n arcana arcana-backend-avatars \
      -o jsonpath='{.status.phase}'
  )" || {
    echo 'STOP: avatar PVC does not exist' >&2
    return 1
  }
  test "$PVC_PHASE" = Bound || {
    printf 'STOP: avatar PVC phase is %s, not Bound\n' "$PVC_PHASE" >&2
    return 1
  }

  MOUNTS="$(
    kubectl get deployment -n arcana arcana-backend \
      -o jsonpath='{range .spec.template.spec.containers[0].volumeMounts[*]}{.name}{"="}{.mountPath}{"\n"}{end}'
  )" || return 1
  printf '%s\n' "$MOUNTS"
  test "$MOUNTS" = 'avatars=/avatar' || {
    echo 'STOP: live backend does not have exactly the expected avatar mount' >&2
    return 1
  }

  CLAIM_NAME="$(
    kubectl get deployment -n arcana arcana-backend \
      -o jsonpath='{.spec.template.spec.volumes[?(@.name=="avatars")].persistentVolumeClaim.claimName}'
  )" || return 1
  test "$CLAIM_NAME" = arcana-backend-avatars || {
    echo 'STOP: avatar mount is not backed by the expected PVC' >&2
    return 1
  }

  kubectl exec -n arcana deployment/arcana-backend -- \
    /bin/sh -ec '
      COUNT="$(find /avatar -xdev -type f -printf . | wc -c)"
      test "$COUNT" = 0 || {
        echo "STOP: new avatar claim is not empty" >&2
        exit 1
      }
      printf "avatar_files=%s\n" "$COUNT"
      touch /avatar/.write-test
      rm /avatar/.write-test
      echo "Avatar claim is writable"
    ' || return 1

  curl --proto '=http' -fsS http://127.0.0.1:18000/api/health/ \
    || return 1
  curl --proto '=http' -fsS http://127.0.0.1:18000/api/health/db \
    || return 1

  LIVE_JOBS="$(kubectl get jobs -n arcana -o name)" || return 1
  LIVE_INGRESSES="$(kubectl get ingress -n arcana -o name)" || return 1
  test -z "$LIVE_JOBS" || {
    echo 'STOP: an unexpected Job exists' >&2
    return 1
  }
  test -z "$LIVE_INGRESSES" || {
    echo 'STOP: an unexpected Ingress exists' >&2
    return 1
  }

  kubectl get pvc -n arcana arcana-backend-avatars -o wide
  echo 'Confirmed: empty persistent avatar storage is mounted and writable'
}

verify_avatar_storage
unset -f verify_avatar_storage
```

Require the PVC `Bound`, mount `avatars /avatar`, zero avatar files before the
write test, successful write/remove, healthy application/database responses,
and no Job or Ingress. Docker remains public and untouched.

### 38.5 Stop before copying production avatar data

**Run on: no machine; this is a review checkpoint.**

The empty Kubernetes claim is now durable and internally mounted, but it is not
ready for cutover until the two inventoried Docker avatar files are copied and
verified. Do not test avatar upload against Kubernetes: doing so would make the
destination non-empty and invalidate the fail-closed initial copy.

## 39. Back up and seed the avatar claim

This section first creates a private compressed backup on the VPS, then streams
a read-only snapshot from the Docker bind mount into the empty Kubernetes
claim. It neither deletes nor modifies Docker source files. Docker remains the
public writer, so this is only an initial seed; a final delta reconciliation is
required at cutover.

### 39.1 Create a recoverable source snapshot

**Run on: VPS, through `ssh vps` from the current administration workstation.**

```bash
ssh vps '
  set -eu
  umask 077

  AVATAR_SOURCE="$(
    docker inspect tarot-backend \
      --format "{{range .Mounts}}{{if eq .Destination \"/avatar\"}}{{.Source}}{{end}}{{end}}"
  )"
  test -n "$AVATAR_SOURCE"
  test -d "$AVATAR_SOURCE"
  test ! -L "$AVATAR_SOURCE"

  SNAPSHOT_DIR="$HOME/arcana-avatar-snapshots"
  mkdir -p "$SNAPSHOT_DIR"
  chmod 700 "$SNAPSHOT_DIR"

  SNAPSHOT="$SNAPSHOT_DIR/avatars-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
  test ! -e "$SNAPSHOT" || {
    echo "STOP: snapshot path already exists" >&2
    exit 1
  }

  tar -C "$AVATAR_SOURCE" -czf "$SNAPSHOT" .
  test -s "$SNAPSHOT"
  chmod 600 "$SNAPSHOT"

  printf "snapshot=%s\n" "$SNAPSHOT"
  sha256sum "$SNAPSHOT"
  printf "regular_files="
  find "$AVATAR_SOURCE" -xdev -type f -printf . | wc -c
  printf "bytes="
  find "$AVATAR_SOURCE" -xdev -type f -printf "%s\n" \
    | awk "{ total += \$1 } END { print total + 0 }"
'
```

Record the snapshot path and SHA-256 digest. Require mode 600 implicitly from
the successful block and the same source aggregates observed in Section 37:
two regular files and 105162 bytes. If production changed, record the new
values and use those as the seed baseline; do not assume data loss.

### 39.2 Reconfirm the destination is empty and isolated

**Run on: current administration workstation (the company Ubuntu machine).**

```bash
kubectl exec -n arcana deployment/arcana-backend -- \
  /bin/sh -ec '
    COUNT="$(find /avatar -xdev -type f -printf . | wc -c)"
    test "$COUNT" = 0 || {
      echo "STOP: avatar destination is not empty" >&2
      exit 1
    }
    echo "Confirmed: avatar destination is empty"
  '

kubectl get ingress -n arcana
kubectl get jobs -n arcana
```

Require an empty destination and no Ingress or Job. If the destination is not
empty, stop; do not overwrite or delete it.

### 39.3 Stream the initial snapshot into the claim

**Run on: current administration workstation (the company Ubuntu machine).
The left side reads through `ssh vps`; the right side writes only to the
Kubernetes avatar claim.**

```bash
set -o pipefail

ssh vps '
  set -eu
  AVATAR_SOURCE="$(
    docker inspect tarot-backend \
      --format "{{range .Mounts}}{{if eq .Destination \"/avatar\"}}{{.Source}}{{end}}{{end}}"
  )"
  test -n "$AVATAR_SOURCE"
  test -d "$AVATAR_SOURCE"
  test ! -L "$AVATAR_SOURCE"
  tar -C "$AVATAR_SOURCE" -cpf - .
' | kubectl exec -i -n arcana deployment/arcana-backend -- \
  tar -C /avatar --no-same-owner -xpf -
```

The source command performs no writes. `--no-same-owner` is required because
the hardened backend container drops `CHOWN`; destination files retain the
extracting process's ownership rather than Docker's numeric UID/GID metadata.
If either side fails, stop and inspect the destination without retrying or
deleting files.

### 39.4 Verify aggregate content and integrity

**Run on: current administration workstation (the company Ubuntu machine).**

Compute source and destination content-set digests. Filenames participate in
the digest but are never printed:

```bash
SOURCE_CONTENT_DIGEST="$(
  ssh vps '
    set -eu
    AVATAR_SOURCE="$(
      docker inspect tarot-backend \
        --format "{{range .Mounts}}{{if eq .Destination \"/avatar\"}}{{.Source}}{{end}}{{end}}"
    )"
    test -d "$AVATAR_SOURCE"
    cd "$AVATAR_SOURCE"
    find . -xdev -type f -exec sha256sum {} + \
      | LC_ALL=C sort \
      | sha256sum \
      | awk "{print \$1}"
  '
)" || false

DESTINATION_CONTENT_DIGEST="$(
  kubectl exec -n arcana deployment/arcana-backend -- \
    /bin/sh -ec '
      cd /avatar
      find . -xdev -type f -exec sha256sum {} + \
        | LC_ALL=C sort \
        | sha256sum \
        | awk "{print \$1}"
    '
)" || false

test -n "$SOURCE_CONTENT_DIGEST"
test "$SOURCE_CONTENT_DIGEST" = "$DESTINATION_CONTENT_DIGEST" || {
  echo 'STOP: avatar content digests differ' >&2
  false
}

printf 'content_digest=%s\n' "$SOURCE_CONTENT_DIGEST"

kubectl exec -n arcana deployment/arcana-backend -- \
  /bin/sh -ec '
    printf "regular_files="
    find /avatar -xdev -type f -printf . | wc -c
    printf "bytes="
    find /avatar -xdev -type f -printf "%s\n" \
      | awk "{ total += \$1 } END { print total + 0 }"
  '
```

Require matching non-empty digests and destination aggregates equal to the
snapshot baseline. Do not print file names.

### 39.5 Verify persistence across one controlled backend rollout

**Run on: current administration workstation (the company Ubuntu machine).**

Capture the current Pod name, restart only the internal Kubernetes backend,
and confirm the same digest afterward:

```bash
verify_avatar_persistence() {
  local OLD_BACKEND_POD NEW_BACKEND_POD
  local PRE_RESTART_DIGEST POST_RESTART_DIGEST

  OLD_BACKEND_POD="$(
    kubectl get pod -n arcana \
      -l app.kubernetes.io/name=arcana-backend \
      -o jsonpath='{.items[0].metadata.name}'
  )" || return 1
  test -n "$OLD_BACKEND_POD" || return 1

  PRE_RESTART_DIGEST="$(
    kubectl exec -n arcana deployment/arcana-backend -- \
      /bin/sh -ec '
        cd /avatar
        find . -xdev -type f -exec sha256sum {} + \
          | LC_ALL=C sort \
          | sha256sum \
          | awk "{print \$1}"
      '
  )" || return 1
  test -n "$PRE_RESTART_DIGEST" || return 1

  kubectl rollout restart -n arcana deployment/arcana-backend || return 1
  kubectl rollout status -n arcana deployment/arcana-backend \
    --timeout=5m || return 1

  NEW_BACKEND_POD="$(
    kubectl get pod -n arcana \
      -l app.kubernetes.io/name=arcana-backend \
      -o jsonpath='{.items[0].metadata.name}'
  )" || return 1
  test -n "$NEW_BACKEND_POD" || return 1
  test "$NEW_BACKEND_POD" != "$OLD_BACKEND_POD" || {
    echo 'STOP: backend Pod name did not change' >&2
    return 1
  }

  POST_RESTART_DIGEST="$(
    kubectl exec -n arcana deployment/arcana-backend -- \
      /bin/sh -ec '
        cd /avatar
        find . -xdev -type f -exec sha256sum {} + \
          | LC_ALL=C sort \
          | sha256sum \
          | awk "{print \$1}"
      '
  )" || return 1

  test "$POST_RESTART_DIGEST" = "$PRE_RESTART_DIGEST" || {
    echo 'STOP: avatar data did not persist across rollout' >&2
    return 1
  }

  curl --proto '=http' -fsS http://127.0.0.1:18000/api/health/ \
    || return 1
  curl --proto '=http' -fsS http://127.0.0.1:18000/api/health/db \
    || return 1

  printf 'persisted_content_digest=%s\n' "$POST_RESTART_DIGEST"
  echo 'Confirmed: avatar data persisted across the backend rollout'
}

verify_avatar_persistence
unset -f verify_avatar_persistence
```

`kubectl rollout restart` changes only the live Pod-template annotation. Argo CD
may report the Deployment `OutOfSync`; hard-refreshing or the next guarded sync
will restore the Git-rendered template without affecting the PVC.

### 39.6 Stop before Beat or public cutover

**Run on: no machine; this is a review checkpoint.**

The initial avatar snapshot is now durable in Kubernetes, while Docker remains
the public source of truth and may continue receiving avatar changes. Preserve
the private VPS snapshot. Do not delete Docker files, activate Kubernetes Beat,
create an Ingress, or stop Docker.

Before public cutover, perform a short write-freeze or maintenance window,
reconcile a final avatar delta, verify matching content digests again, and only
then route traffic. The final-delta procedure must be authored separately; do
not improvise deletion semantics with `rsync --delete`.

## 40. Restore Git convergence and inventory the traffic cutover

The controlled persistence test added a live
`kubectl.kubernetes.io/restartedAt` Pod-template annotation that is absent from
Git. Reconcile that intentional drift through Argo CD before designing public
routing. This section does not activate Beat, copy another avatar snapshot,
change Traefik, expose a NodePort, or take over ports 80/443.

### 40.1 Prove the restart annotation is the only expected drift

**Run on: current administration workstation (the company Ubuntu machine),
from the root of `~/Personal/arcana-deployment`.**

```bash
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"

git status --short
git rev-parse HEAD
git rev-parse origin/main

kubectl get application -n argocd arcana-production \
  -o jsonpath='revision={.status.sync.revision}{"\n"}sync={.status.sync.status}{"\n"}enabled={.spec.syncPolicy.automated.enabled}{"\n"}operation={.operation}{"\n"}'

kubectl get application -n argocd arcana-production \
  -o jsonpath='{range .status.conditions[*]}{.type}{": "}{.message}{"\n"}{end}'

kubectl get application -n argocd arcana-production \
  -o jsonpath='{range .status.resources[*]}{.kind}{"\t"}{.namespace}{"\t"}{.name}{"\t"}{.status}{"\n"}{end}' \
  | sort

kubectl get deployment -n arcana arcana-backend \
  -o jsonpath='restartedAt={.spec.template.metadata.annotations.kubectl\.kubernetes\.io/restartedAt}{"\n"}'

kubectl get jobs -n arcana
kubectl get ingress -n arcana
```

Require matching Git/remote/rendered revisions, automated synchronization
`false`, no operation or condition, no Job or Ingress, and only the backend
Deployment `OutOfSync`. The live `restartedAt` value must be non-empty. If any
other resource is `OutOfSync`, stop and inspect it before synchronizing.

### 40.2 Reconcile the exact revision through Argo CD

**Run on: current administration workstation (the company Ubuntu machine).**

```bash
reconcile_backend_restart_drift() {
  local EXPECTED_REVISION REMOTE_REVISION OBSERVED_REVISION
  local AUTOMATED_ENABLED ACTIVE_OPERATION LIVE_JOBS LIVE_INGRESSES
  local BACKEND_REPLICAS FRONTEND_REPLICAS WORKER_REPLICAS BEAT_REPLICAS
  local PVC_PHASE AVATAR_DIGEST

  EXPECTED_REVISION="$(git rev-parse HEAD)" || return 1
  REMOTE_REVISION="$(git rev-parse origin/main)" || return 1
  OBSERVED_REVISION="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.status.sync.revision}'
  )" || return 1

  test "$EXPECTED_REVISION" = "$REMOTE_REVISION" \
    && test "$EXPECTED_REVISION" = "$OBSERVED_REVISION" || {
      echo 'STOP: reconciliation revisions do not match' >&2
      return 1
    }

  AUTOMATED_ENABLED="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.spec.syncPolicy.automated.enabled}'
  )" || return 1
  ACTIVE_OPERATION="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.operation}'
  )" || return 1
  LIVE_JOBS="$(kubectl get jobs -n arcana -o name)" || return 1
  LIVE_INGRESSES="$(kubectl get ingress -n arcana -o name)" || return 1

  test "$AUTOMATED_ENABLED" = false || return 1
  test -z "$ACTIVE_OPERATION" || return 1
  test -z "$LIVE_JOBS" || return 1
  test -z "$LIVE_INGRESSES" || return 1

  BACKEND_REPLICAS="$(kubectl get deployment -n arcana arcana-backend -o jsonpath='{.spec.replicas}')" || return 1
  FRONTEND_REPLICAS="$(kubectl get deployment -n arcana arcana-frontend -o jsonpath='{.spec.replicas}')" || return 1
  WORKER_REPLICAS="$(kubectl get deployment -n arcana arcana-celery-worker -o jsonpath='{.spec.replicas}')" || return 1
  BEAT_REPLICAS="$(kubectl get deployment -n arcana arcana-celery-beat -o jsonpath='{.spec.replicas}')" || return 1

  test "$BACKEND_REPLICAS" = 1 \
    && test "$FRONTEND_REPLICAS" = 1 \
    && test "$WORKER_REPLICAS" = 1 \
    && test "$BEAT_REPLICAS" = 0 || {
      echo 'STOP: live workload boundary is unexpected' >&2
      return 1
    }

  PVC_PHASE="$(
    kubectl get pvc -n arcana arcana-backend-avatars \
      -o jsonpath='{.status.phase}'
  )" || return 1
  test "$PVC_PHASE" = Bound || return 1

  AVATAR_DIGEST="$(
    kubectl exec -n arcana deployment/arcana-backend -- \
      /bin/sh -ec '
        cd /avatar
        find . -xdev -type f -exec sha256sum {} + \
          | LC_ALL=C sort \
          | sha256sum \
          | awk "{print \$1}"
      '
  )" || return 1
  test "$AVATAR_DIGEST" = \
    76fd8d51b20469f96abadacf64105e1ce80da810a92a4bd41d53b02501f7ce16 || {
      echo 'STOP: Kubernetes avatar digest changed' >&2
      return 1
    }

  kubectl patch application -n argocd arcana-production \
    --type=merge \
    --patch "{\"operation\":{\"initiatedBy\":{\"username\":\"restart-drift-reconciliation-guide\"},\"sync\":{\"revision\":\"$EXPECTED_REVISION\",\"prune\":false}}}" \
    || return 1

  printf 'Requested restart-drift reconciliation at %s\n' \
    "$EXPECTED_REVISION"
}

reconcile_backend_restart_drift
unset -f reconcile_backend_restart_drift
```

Use the bounded operation poll from Section 36.5 and require `Succeeded` at the
exact revision. This reconciliation may replace the backend Pod once more as
the live-only annotation is removed.

### 40.3 Verify convergence and persistent data again

**Run on: current administration workstation (the company Ubuntu machine).**

```bash
kubectl rollout status -n arcana deployment/arcana-backend --timeout=5m

kubectl get application -n argocd arcana-production \
  -o jsonpath='sync={.status.sync.status}{"\n"}health={.status.health.status}{"\n"}revision={.status.sync.revision}{"\n"}operation={.operation}{"\n"}'

kubectl get deployment -n arcana arcana-backend \
  -o jsonpath='restartedAt={.spec.template.metadata.annotations.kubectl\.kubernetes\.io/restartedAt}{"\n"}'

kubectl exec -n arcana deployment/arcana-backend -- \
  /bin/sh -ec '
    cd /avatar
    printf "regular_files="
    find . -xdev -type f -printf . | wc -c
    printf "bytes="
    find . -xdev -type f -printf "%s\n" \
      | awk "{total += \$1} END {print total + 0}"
    printf "content_digest="
    find . -xdev -type f -exec sha256sum {} + \
      | LC_ALL=C sort \
      | sha256sum \
      | awk "{print \$1}"
  '

kubectl get pvc -n arcana arcana-backend-avatars -o wide
kubectl get jobs -n arcana
kubectl get ingress -n arcana
```

Require `Synced`, the expected revision, no active operation, an empty
`restartedAt`, two files, 105162 bytes, the recorded digest, a `Bound` claim,
and no Job or Ingress. Restart the backend Service port-forward if its
connection crossed the rollout, then repeat both health checks.

### 40.4 Inventory the existing Docker Traefik boundary

**Run on: VPS, through `ssh vps` from the current administration workstation.**

This block prints runtime topology and routing labels but no environment
variables or certificate material:

```bash
ssh vps '
  set -eu

  docker ps --filter name=traefik \
    --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

  for CONTAINER in traefik tarot-backend tarot-frontend; do
    docker inspect "$CONTAINER" \
      --format "container={{.Name}} networks={{range \$name, \$_ := .NetworkSettings.Networks}}{{\$name}} {{end}}"
  done

  for CONTAINER in tarot-backend tarot-frontend; do
    docker inspect "$CONTAINER" \
      --format "container={{.Name}}{{range \$key, \$value := .Config.Labels}}{{if or (eq \$key \"traefik.enable\") (eq \$key \"traefik.http.routers.tarot-backend.rule\") (eq \$key \"traefik.http.routers.tarot-frontend.rule\") (eq \$key \"traefik.http.services.tarot-backend.loadbalancer.server.port\") (eq \$key \"traefik.http.services.tarot-frontend.loadbalancer.server.port\")}}{{printf \"\\n%s=%s\" \$key \$value}}{{end}}{{end}}"
  done

  sudo ss -lntup | grep -E ":(80|443|6443)\\b"
'
```

Record the shared Docker networks, current host rules, service ports, Traefik
image, and listeners. Do not inspect environment variables, TLS files, or
secret stores.

### 40.5 Inventory the Kubernetes side of the boundary

**Run on: current administration workstation (the company Ubuntu machine).**

```bash
kubectl get svc -n arcana -o wide
kubectl get ingress -n arcana
kubectl get pods -n kube-system

ssh vps '
  sudo test -f /etc/rancher/k3s/config.yaml
  sudo grep -E "^(disable:|  - traefik|  - servicelb)" \
    /etc/rancher/k3s/config.yaml
'
```

Require application Services to remain `ClusterIP`, no Ingress, and no K3s
Traefik or ServiceLB workload. The K3s configuration must still disable both
packaged components.

### 40.6 Stop before selecting or implementing the traffic bridge

**Run on: no machine; this is a review checkpoint.**

Do not add a NodePort, change Docker Traefik labels/configuration, stop a
Docker container, activate Beat, alter DNS, or open a firewall port. Use the
inventory to select one explicit cutover architecture in the next section.

The architecture must preserve Docker Traefik on ports 80/443 until the actual
switch, expose Kubernetes only through a narrowly scoped bridge, support both
frontend and backend host families, include a rollback target, and coordinate
the final avatar delta with the moment Docker stops being the public writer.

## 41. Select the Docker Traefik to Kubernetes traffic bridge

The boundary inventory established:

- Docker Traefik `v3.7.1` exclusively owns host ports 80 and 443 for IPv4 and
  IPv6 and remains the production TLS edge.
- Docker Traefik, `tarot-backend`, and `tarot-frontend` share Docker network
  `localnet`.
- The existing backend router serves three backend hostnames on container port
  8000; the frontend router serves three frontend hostnames on container port
  3000.
- Kubernetes backend and frontend Services remain internal `ClusterIP`
  Services. No Ingress exists.
- K3s listens on TCP 6443, while packaged Traefik and ServiceLB remain disabled
  in `/etc/rancher/k3s/config.yaml`.

Do not replace the edge, add NodePorts, or alter routing yet. First determine
whether the existing edge can support a narrowly scoped reversible bridge.

### 41.1 Inspect provider support and test cross-runtime reachability

**Run on: VPS.**

Inspect only Traefik's command and mount topology; do not inspect environment
variables or certificate content:

```bash
docker inspect traefik \
  --format 'command={{json .Config.Cmd}}'

docker inspect traefik \
  --format '{{range .Mounts}}source={{.Source}} destination={{.Destination}} read_write={{.RW}}{{"\n"}}{{end}}'
```

Test whether the existing Docker `localnet` path can reach the current
Kubernetes ClusterIPs. The commands use the existing backend container because
its image already contains `curl`; they do not print credentials or modify
either application:

```bash
docker exec tarot-backend \
  curl -fsS -o /dev/null \
  -w 'kubernetes_backend_http=%{http_code}\n' \
  http://10.43.63.108:8000/api/health/

docker exec tarot-backend \
  curl -fsS -o /dev/null \
  -w 'kubernetes_frontend_http=%{http_code}\n' \
  http://10.43.179.193:3000/
```

Require successful HTTP responses from both Services. A backend `200` and a
frontend `200` or intentional redirect prove network reachability; they do not
yet authorize routing production traffic to Kubernetes.

The inspection found no file provider or dynamic-configuration mount. Docker
`localnet` nevertheless reached the Kubernetes backend with HTTP 200 and the
frontend with its expected HTTP 307 redirect. Traefik's Docker-provider
`loadbalancer.server.url` label can define an explicit upstream URL, so the
preferred bridge is a small routing-only Docker Compose service whose labels
target the two reachable ClusterIPs. It requires no NodePort and no Traefik
restart.

Do not edit Traefik configuration, labels, DNS, firewall rules, or Kubernetes
Services in this subsection. Retain the command output for architecture review.

### 41.2 Locate the Compose source that owns Traefik

**Run on: VPS.**

Read only the Docker Compose provenance labels and resolved service list. Do
not print the Compose file, environment, ACME storage, or certificate data:

```bash
docker inspect traefik \
  --format 'project={{index .Config.Labels "com.docker.compose.project"}} working_dir={{index .Config.Labels "com.docker.compose.project.working_dir"}} config_files={{index .Config.Labels "com.docker.compose.project.config_files"}} service={{index .Config.Labels "com.docker.compose.service"}}'
```

The provenance output identified Compose project `traefik`, working directory
`/root/traefik`, service `traefik`, and authoritative file
`/root/traefik/docker-compose.yaml`. Verify that exact file and list only the
resolved service and network names:

```bash
sudo test -f /root/traefik/docker-compose.yaml
sudo docker compose \
  -f /root/traefik/docker-compose.yaml \
  config --services

sudo docker compose \
  -f /root/traefik/docker-compose.yaml \
  config --networks

sudo sha256sum /root/traefik/docker-compose.yaml

sudo git -C /root/traefik status --short --branch 2>/dev/null \
  || echo 'Traefik directory is not a Git working tree'
```

Require the file to exist, the resolved service list to contain the current
Traefik service, and the network list to contain `localnet`. Record the
SHA-256 digest as the pre-change identity. Do not edit, copy, restart, or
recreate anything yet.

The next subsection will add a reviewed routing-only service to this same
Compose project. Its canary routers will require both an existing production
hostname and a private `X-Arcana-Canary: k3s` request header, giving them higher
specificity than the existing host-only routers. Ordinary requests will remain
on the Docker backend and frontend. The canary services will use explicit
Kubernetes ClusterIP URLs and health checks. Only after canary verification
will a separate, reversible production-switch procedure be considered.

The authoritative Compose file is not version-controlled. Its pre-change
SHA-256 is
`d479e516f13111e7e93fc6c6807b277f927d92db76f001e218410ddf212d058e`.
Do not edit that file for the canary. Use a separate
`/root/traefik/arcana-k3s-canary.yaml` Compose file so the routing carrier can
be managed and rolled back independently.

### 41.3 Preflight the routing-only carrier

**Run on: VPS.**

The carrier will reuse the already present `redis:7-alpine` image only for its
small Alpine userspace and long-running `sleep` process; it will not start a
Redis server, mount data, or expose a port. Confirm the required executable is
present in the existing Redis container without changing it:

```bash
docker exec tarot-redis \
  /bin/sh -ec 'command -v sleep; id'
```

Refuse collisions with an earlier file, container, service, or router label:

```bash
sudo test ! -e /root/traefik/arcana-k3s-canary.yaml \
  && echo 'Canary Compose path is available'

test -z "$(docker ps -a --filter name='^/arcana-k3s-router$' -q)" \
  && echo 'Canary container name is available'

docker ps --format '{{.Names}} {{.Labels}}' \
  | grep -E 'arcana-k3s-(backend|frontend)-canary' \
  && echo 'STOP: canary router/service label already exists' \
  || echo 'Canary router/service labels are available'
```

Confirm `localnet` is an existing external bridge and the two Kubernetes
Services remain reachable at the exact targets that the labels will use:

```bash
docker network inspect localnet \
  --format 'name={{.Name}} driver={{.Driver}} scope={{.Scope}}'

docker exec tarot-backend \
  curl -fsS -o /dev/null \
  -w 'kubernetes_backend_http=%{http_code}\n' \
  http://10.43.63.108:8000/api/health/

docker exec tarot-backend \
  curl -fsS -o /dev/null \
  -w 'kubernetes_frontend_http=%{http_code}\n' \
  http://10.43.179.193:3000/
```

Require an available path/name/label namespace, `localnet` with driver
`bridge`, backend HTTP 200, and frontend HTTP 200 or its intentional 307.
Do not create the canary file or container yet.

### 41.4 Define and validate the inert canary carrier

**Run on: VPS.**

Create a separate Compose file without modifying the authoritative Traefik
file:

```bash
sudoedit /root/traefik/arcana-k3s-canary.yaml
```

Enter exactly:

```yaml
services:
  arcana-k3s-router:
    image: redis:7-alpine
    container_name: arcana-k3s-router
    restart: unless-stopped
    entrypoint:
      - /bin/sleep
    command:
      - "2147483647"
    user: "65534:65534"
    read_only: true
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    networks:
      - localnet
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=localnet"

      - "traefik.http.routers.arcana-k3s-backend-canary.rule=(Host(`backend-tarotreader.nguyenvanloc.com`) || Host(`backend-arcanaai.nguyenvanloc.com`) || Host(`backend.stacyn.io.vn`)) && Header(`X-Arcana-Canary`, `k3s`)"
      - "traefik.http.routers.arcana-k3s-backend-canary.entrypoints=websecure"
      - "traefik.http.routers.arcana-k3s-backend-canary.tls=true"
      - "traefik.http.routers.arcana-k3s-backend-canary.tls.certresolver=le"
      - "traefik.http.routers.arcana-k3s-backend-canary.priority=10000"
      - "traefik.http.routers.arcana-k3s-backend-canary.service=arcana-k3s-backend-canary"
      - "traefik.http.services.arcana-k3s-backend-canary.loadbalancer.server.url=http://10.43.63.108:8000"
      - "traefik.http.services.arcana-k3s-backend-canary.loadbalancer.passhostheader=true"
      - "traefik.http.services.arcana-k3s-backend-canary.loadbalancer.healthcheck.path=/api/health/"
      - "traefik.http.services.arcana-k3s-backend-canary.loadbalancer.healthcheck.interval=10s"
      - "traefik.http.services.arcana-k3s-backend-canary.loadbalancer.healthcheck.timeout=3s"

      - "traefik.http.routers.arcana-k3s-frontend-canary.rule=(Host(`tarot-reader.nguyenvanloc.com`) || Host(`arcanaai.nguyenvanloc.com`) || Host(`stacyn.io.vn`)) && Header(`X-Arcana-Canary`, `k3s`)"
      - "traefik.http.routers.arcana-k3s-frontend-canary.entrypoints=websecure"
      - "traefik.http.routers.arcana-k3s-frontend-canary.tls=true"
      - "traefik.http.routers.arcana-k3s-frontend-canary.tls.certresolver=le"
      - "traefik.http.routers.arcana-k3s-frontend-canary.priority=10000"
      - "traefik.http.routers.arcana-k3s-frontend-canary.service=arcana-k3s-frontend-canary"
      - "traefik.http.services.arcana-k3s-frontend-canary.loadbalancer.server.url=http://10.43.179.193:3000"
      - "traefik.http.services.arcana-k3s-frontend-canary.loadbalancer.passhostheader=true"
      - "traefik.http.services.arcana-k3s-frontend-canary.loadbalancer.healthcheck.path=/"
      - "traefik.http.services.arcana-k3s-frontend-canary.loadbalancer.healthcheck.interval=10s"
      - "traefik.http.services.arcana-k3s-frontend-canary.loadbalancer.healthcheck.timeout=3s"

networks:
  localnet:
    external: true
```

The container runs no Redis server and exposes no port. UID/GID 65534,
read-only root storage, all capabilities dropped, and `no-new-privileges`
reduce the carrier's runtime authority. The explicit service URLs bypass the
carrier and send canary traffic directly from Traefik to the reachable
Kubernetes ClusterIPs.

Validate the combined Compose model without creating or recreating anything:

```bash
sudo docker compose \
  -f /root/traefik/docker-compose.yaml \
  -f /root/traefik/arcana-k3s-canary.yaml \
  config -q

sudo docker compose \
  -f /root/traefik/docker-compose.yaml \
  -f /root/traefik/arcana-k3s-canary.yaml \
  config --services

sudo sha256sum /root/traefik/docker-compose.yaml
sudo sha256sum /root/traefik/arcana-k3s-canary.yaml

test -z "$(docker ps -a --filter name='^/arcana-k3s-router$' -q)" \
  && echo 'Canary remains inert'
```

Require a valid Compose model containing services `traefik` and
`arcana-k3s-router`, the unchanged authoritative-file digest
`d479e516f13111e7e93fc6c6807b277f927d92db76f001e218410ddf212d058e`,
a recorded canary-file digest, and no canary container. Do not run `compose
up`, restart Traefik, or send a canary request yet.

The validated canary-file SHA-256 is
`b78310ca5dae4cedbaac95bc942c6abaf75e25f89084368128a8d8fa6c8a6281`.

### 41.5 Preview creation of only the canary carrier

**Run on: VPS.**

Record the production edge identity before any activation:

```bash
docker inspect traefik \
  --format 'traefik_id={{.Id}} started={{.State.StartedAt}} status={{.State.Status}}'
```

Ask Compose for a dry-run of the targeted, dependency-free creation:

```bash
sudo docker compose \
  -f /root/traefik/docker-compose.yaml \
  -f /root/traefik/arcana-k3s-canary.yaml \
  --dry-run up -d --no-deps arcana-k3s-router
```

Require the preview to mention only pulling if necessary and creating/starting
`arcana-k3s-router`. It must not propose recreating, restarting, stopping, or
removing `traefik` or any other container. If the installed Compose version
does not support `--dry-run`, stop; do not substitute a real `up` command.

Do not activate the carrier in this subsection. Retain the Traefik identity and
dry-run output for review.

The dry run proposed starting only `arcana-k3s-router`. The production Traefik
identity before activation was container
`1a0aea78ea0718cb7463266d7d9a80843750f19fdb7fee73823fe681e1d0159b`,
started at `2026-08-06T07:26:54.581700352Z`.

### 41.6 Activate only the routing carrier

**Run on: VPS.**

Capture the production edge identity in shell variables, create only the
dependency-free carrier, and require the edge identity to remain unchanged:

```bash
TRAEFIK_ID_BEFORE="$(docker inspect traefik --format '{{.Id}}')" || exit 1
TRAEFIK_STARTED_BEFORE="$(docker inspect traefik --format '{{.State.StartedAt}}')" || exit 1

sudo docker compose \
  -f /root/traefik/docker-compose.yaml \
  -f /root/traefik/arcana-k3s-canary.yaml \
  up -d --no-deps arcana-k3s-router

TRAEFIK_ID_AFTER="$(docker inspect traefik --format '{{.Id}}')" || exit 1
TRAEFIK_STARTED_AFTER="$(docker inspect traefik --format '{{.State.StartedAt}}')" || exit 1

test "$TRAEFIK_ID_BEFORE" = "$TRAEFIK_ID_AFTER" \
  && test "$TRAEFIK_STARTED_BEFORE" = "$TRAEFIK_STARTED_AFTER" \
  && echo 'Production Traefik was not recreated or restarted'
```

Inspect only the carrier's runtime and security posture:

```bash
docker inspect arcana-k3s-router \
  --format 'status={{.State.Status}} started={{.State.StartedAt}} user={{.Config.User}} read_only={{.HostConfig.ReadonlyRootfs}} cap_drop={{json .HostConfig.CapDrop}} security_opt={{json .HostConfig.SecurityOpt}} entrypoint={{json .Config.Entrypoint}} command={{json .Config.Cmd}} networks={{range $name, $_ := .NetworkSettings.Networks}}{{$name}} {{end}}'

docker ps \
  --filter name='^/arcana-k3s-router$' \
  --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'

sudo sha256sum /root/traefik/docker-compose.yaml
sudo sha256sum /root/traefik/arcana-k3s-canary.yaml
```

Require a running carrier with user `65534:65534`, read-only root storage,
`ALL` capabilities dropped, `no-new-privileges:true`, the long-running sleep
command, only `localnet`, and no published ports. Both Compose file digests must
remain identical to their validated values.

If the targeted `up` command fails or Traefik's identity changes, stop and
report the output. Do not retry, recreate Traefik, or send canary traffic. If
all checks pass, ordinary traffic is still unchanged because the new routers
require the canary header.

Activation created only `arcana-k3s-router`; production Traefik retained its
container ID and start time. The carrier runs as `65534:65534`, has read-only
root storage, drops all capabilities, enables `no-new-privileges`, runs only
the long sleep command, and joins only `localnet`. Both Compose digests remained
unchanged. Docker lists `6379/tcp` because the reused Redis image declares that
container port, but there is no host mapping and the carrier does not run a
Redis server.

### 41.7 Verify loaded canary routes and header-gated HTTPS

**Run on: VPS.**

Query Traefik's internal API through the existing backend container and print
only the canary router names, rules, services, and status:

```bash
docker exec tarot-backend \
  curl -fsS http://traefik:8080/api/http/routers \
  | python3 -c '
import json, sys
for item in json.load(sys.stdin):
    if item.get("name", "").startswith("arcana-k3s-"):
        print(
            f"name={item.get('"'"'name'"'"')} "
            f"status={item.get('"'"'status'"'"')} "
            f"service={item.get('"'"'service'"'"')} "
            f"rule={item.get('"'"'rule'"'"')}"
        )
'
```

Print only the canary service names, status, and configured upstream URLs:

```bash
docker exec tarot-backend \
  curl -fsS http://traefik:8080/api/http/services \
  | python3 -c '
import json, sys
for item in json.load(sys.stdin):
    if item.get("name", "").startswith("arcana-k3s-"):
        urls = [
            server.get("url")
            for server in item.get("loadBalancer", {}).get("servers", [])
        ]
        print(
            f"name={item.get('"'"'name'"'"')} "
            f"status={item.get('"'"'status'"'"')} "
            f"urls={'"'"','"'"'.join(filter(None, urls))}"
        )
'
```

Require two enabled routers with the header matcher and the expected explicit
backend/frontend ClusterIP URLs. The current Docker Traefik serves its default
self-signed certificate when contacted directly at the origin, including for
the pre-existing host-only routers. Therefore, use `-k` only for this local
origin routing test; it deliberately bypasses certificate verification while
still preserving the production hostname and canary header:

```bash
curl --resolve backend-arcanaai.nguyenvanloc.com:443:127.0.0.1 \
  -H 'X-Arcana-Canary: k3s' \
  -kfsS -o /dev/null \
  -w 'backend_canary_http=%{http_code}\n' \
  https://backend-arcanaai.nguyenvanloc.com/api/health/

curl --resolve arcanaai.nguyenvanloc.com:443:127.0.0.1 \
  -H 'X-Arcana-Canary: k3s' \
  -kfsS -o /dev/null \
  -w 'frontend_canary_http=%{http_code} redirect=%{redirect_url}\n' \
  https://arcanaai.nguyenvanloc.com/
```

Require backend HTTP 200 and frontend HTTP 200 or its intentional redirect.
The observed canary results were backend HTTP 200 and frontend HTTP 307 to
`/login`; Traefik's access log identified the canary routers and explicit K3s
ClusterIP upstreams. This proves the Docker-to-Kubernetes routing path.

Validate the user-facing TLS path separately through public DNS and its normal
TLS termination. Do not use `--resolve` or `-k` for these requests:

```bash
curl -H 'X-Arcana-Canary: k3s' \
  -fsS -o /dev/null \
  -w 'backend_public_canary_http=%{http_code}\n' \
  https://backend-arcanaai.nguyenvanloc.com/api/health/

curl -H 'X-Arcana-Canary: k3s' \
  -fsS -o /dev/null \
  -w 'frontend_public_canary_http=%{http_code} redirect=%{redirect_url}\n' \
  https://arcanaai.nguyenvanloc.com/
```

Require successful certificate verification, backend HTTP 200, and frontend
HTTP 200 or its intentional redirect. Do not change the production host-only
routers, activate Beat, or stop any Docker application.

The public canary check passed with strict certificate verification: backend
returned HTTP 200 and frontend returned HTTP 307 to
`https://arcanaai.nguyenvanloc.com/login`. At this checkpoint, both public
canary requests traverse the existing edge and reach the K3s services while
ordinary host-only traffic remains on Docker.

### 41.8 Check workloads after public canary traffic

**Run on: VPS.**

Confirm the deployed workloads remain available and have not restarted after
the public canary requests:

```bash
sudo k3s kubectl get pods -n arcana \
  -o custom-columns='NAME:.metadata.name,READY:.status.containerStatuses[*].ready,STATUS:.status.phase,RESTARTS:.status.containerStatuses[*].restartCount,STARTED:.status.startTime'

sudo k3s kubectl rollout status \
  deployment/arcana-backend \
  deployment/arcana-frontend \
  deployment/arcana-celery-worker \
  -n arcana \
  --timeout=60s
```

Inspect recent namespace events and confirm Traefik recorded real requests on
the canary routers:

```bash
sudo k3s kubectl get events -n arcana \
  --sort-by=.metadata.creationTimestamp \
  | tail -n 30

docker logs traefik \
  --since 10m \
  2>&1 \
  | grep -E 'arcana-k3s-(backend|frontend)-canary@docker' \
  | grep -E '"(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) ' \
  | tail -n 20
```

Require every active Arcana pod to be ready with no new restart, all three
Deployment rollouts to succeed, no warning event indicating a workload or
storage failure, and access-log entries for both canary routers. Do not switch
ordinary production traffic yet.

This checkpoint passed: backend, frontend, Celery worker, and Redis were ready
with zero restarts; all three Deployment rollouts completed; and Traefik logged
Cloudflare-originated requests against both canary routers and their expected
K3s ClusterIP upstreams. The only namespace event was the normal
`WaitForFirstConsumer` state for `arcana-celery-beat-data`. Beat remains scaled
to zero, so no consumer exists and the claim should remain unbound for now.

### 41.9 Compare Docker and K3s HTTP behavior

**Run on: VPS.**

Before switching ordinary traffic, investigate the observed frontend behavior
difference: an unauthenticated request to the Docker frontend root returned
HTTP 200, while the K3s canary returned HTTP 307 to `/login`. Print response
headers for the root and login routes without printing cookies or response
bodies:

```bash
curl -sS -o /dev/null -D - \
  https://arcanaai.nguyenvanloc.com/ \
  | grep -Ei '^(HTTP/|location:|content-type:|content-length:|server:|cf-cache-status:|cache-control:)'

curl -sS -o /dev/null -D - \
  -H 'X-Arcana-Canary: k3s' \
  https://arcanaai.nguyenvanloc.com/ \
  | grep -Ei '^(HTTP/|location:|content-type:|content-length:|server:|cf-cache-status:|cache-control:)'

curl -sS -o /dev/null -D - \
  https://arcanaai.nguyenvanloc.com/login \
  | grep -Ei '^(HTTP/|location:|content-type:|content-length:|server:|cf-cache-status:|cache-control:)'

curl -sS -o /dev/null -D - \
  -H 'X-Arcana-Canary: k3s' \
  https://arcanaai.nguyenvanloc.com/login \
  | grep -Ei '^(HTTP/|location:|content-type:|content-length:|server:|cf-cache-status:|cache-control:)'
```

Compare the public backend API description without printing its contents:

```bash
curl -fsS \
  https://backend-arcanaai.nguyenvanloc.com/openapi.json \
  | sha256sum

curl -fsS \
  -H 'X-Arcana-Canary: k3s' \
  https://backend-arcanaai.nguyenvanloc.com/openapi.json \
  | sha256sum
```

Matching OpenAPI digests prove API-surface parity for the deployed images.
The frontend root difference must be understood as expected authentication or
cache behavior before production routing changes. Do not send credentials,
print cookies, or switch ordinary traffic during this check.

The backend OpenAPI digests matched exactly. Both Docker and K3s returned HTTP
200 for `/login`, but the root difference was reproducible: Docker returned
HTTP 200 and K3s returned HTTP 307 to `/login`. The deployed K3s frontend is
pinned to `47492873ca196bd21eb61a2e3996775fc56f90d5`; at that revision,
frontend middleware tries to authenticate using a frontend-domain cookie and
performs the server-side redirect. Commit
`c126cda4d9da93a2ea058852be0fc20aec9bbdbb` later removed that check because
the HttpOnly authentication cookies belong to the API domains. Current main
`5c09c93c553373f6ada02f303004fb3e882adef1` contains the fix. Do not cut over
the stale K3s frontend.

### 41.10 Preflight the corrected frontend image

**Run on: VPS.**

Confirm CI published the current-main frontend image and refuse a container
name collision:

```bash
docker manifest inspect \
  vanloc1808/tarot-frontend:5c09c93c553373f6ada02f303004fb3e882adef1 \
  >/dev/null \
  && echo 'Corrected frontend image exists'

test -z "$(docker ps -a --filter name='^/arcana-frontend-candidate$' -q)" \
  && echo 'Frontend candidate container name is available'
```

Start only that candidate on the private Docker network. It has no published
host port and no Traefik labels, so it cannot receive public traffic:

```bash
docker run --detach --rm \
  --name arcana-frontend-candidate \
  --network localnet \
  vanloc1808/tarot-frontend:5c09c93c553373f6ada02f303004fb3e882adef1
```

Call its root and login routes from the existing backend container:

```bash
docker exec tarot-backend \
  curl -fsS -o /dev/null \
  -w 'candidate_root_http=%{http_code} redirect=%{redirect_url}\n' \
  http://arcana-frontend-candidate:3000/

docker exec tarot-backend \
  curl -fsS -o /dev/null \
  -w 'candidate_login_http=%{http_code} redirect=%{redirect_url}\n' \
  http://arcana-frontend-candidate:3000/login
```

Require HTTP 200 for both routes. Remove only the temporary candidate; because
it was created with `--rm`, stopping it also removes it:

```bash
docker stop arcana-frontend-candidate

test -z "$(docker ps -a --filter name='^/arcana-frontend-candidate$' -q)" \
  && echo 'Frontend candidate was removed'
```

If either request fails, inspect only the candidate logs with
`docker logs arcana-frontend-candidate` before stopping it. Do not modify the
GitOps image tag or production routing until both candidate requests pass.

The candidate image existed, returned HTTP 200 for both `/` and `/login`, and
was removed successfully. It is approved for a canary-only GitOps rollout.

### 41.11 Roll out the corrected frontend to the K3s canary

**Run on: current administration workstation (the MacBook).**

In the clean deployment repository, update only the frontend image tag:

```bash
cd /Users/vanloc1808/Projects/arcana-deployment

if test -n "$(git status --short)"; then
  echo 'STOP: deployment repository is not clean' >&2
else
  cd apps/arcana/overlays/production
  kustomize edit set image \
    vanloc1808/tarot-frontend=vanloc1808/tarot-frontend:5c09c93c553373f6ada02f303004fb3e882adef1
  cd ../../../..
fi

git diff -- apps/arcana/overlays/production/kustomization.yaml
git diff --check
```

Require the diff to change only the frontend `newTag`; the backend must remain
at `47492873ca196bd21eb61a2e3996775fc56f90d5`. Render with SOPS/KSOPS and
validate all resources:

```bash
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"

command -v ksops

RENDER_DIRECTORY="$(mktemp -d)"
RENDER_FILE="$RENDER_DIRECTORY/production.yaml"

if kustomize build \
  --enable-alpha-plugins \
  --enable-exec \
  apps/arcana/overlays/production \
  >"$RENDER_FILE"; then
  RESOURCE_COUNT="$(rg -c '^apiVersion:' "$RENDER_FILE")"
  printf 'Rendered resources: %s\n' "$RESOURCE_COUNT"

  if test "$RESOURCE_COUNT" -gt 0; then
    kubeconform -strict -summary -exit-on-error "$RENDER_FILE"
    rg 'image:' "$RENDER_FILE" | sort -u
  else
    echo 'STOP: render produced zero resources' >&2
  fi
else
  echo 'STOP: production render failed' >&2
fi

if test -n "$RENDER_FILE" && test -f "$RENDER_FILE"; then
  rm -f -- "$RENDER_FILE"
  echo 'Removed temporary decrypted render'
fi

if test -n "$RENDER_DIRECTORY" \
  && test -d "$RENDER_DIRECTORY"; then
  rmdir -- "$RENDER_DIRECTORY"
fi
```

Do not pipe the renderer directly into validation. Without shell pipeline
failure propagation, a missing `ksops` executable can be hidden by a
downstream command that accepts empty input. The explicit executable check,
render exit status, and positive resource count prevent that false success.

Commit and push the single deployment change:

```bash
git add apps/arcana/overlays/production/kustomization.yaml
git diff --cached --check
git diff --cached --stat
git commit -m 'deploy: update Arcana frontend authentication fix'
git push origin main
```

Keep manual synchronization disabled and request reconciliation of exactly the
new pushed revision:

```bash
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"
EXPECTED_REVISION="$(git rev-parse HEAD)"

kubectl annotate application -n argocd arcana-production \
  argocd.argoproj.io/refresh=hard \
  --overwrite

for attempt in {1..60}; do
  OBSERVED_REVISION="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.status.sync.revision}'
  )"
  test "$OBSERVED_REVISION" = "$EXPECTED_REVISION" && break
  sleep 5
done

if test "$OBSERVED_REVISION" = "$EXPECTED_REVISION"; then
  echo 'Argo CD observed the pushed revision'
else
  echo 'STOP: Argo CD did not observe the pushed revision' >&2
fi

kubectl get application -n argocd arcana-production \
  -o jsonpath='sync={.status.sync.status}{"\n"}health={.status.health.status}{"\n"}revision={.status.sync.revision}{"\n"}enabled={.spec.syncPolicy.automated.enabled}{"\n"}operation={.operation}{"\n"}'

if test "$OBSERVED_REVISION" = "$EXPECTED_REVISION"; then
  kubectl patch application -n argocd arcana-production \
    --type=merge \
    --patch "{\"operation\":{\"initiatedBy\":{\"username\":\"frontend-auth-fix-guide\"},\"sync\":{\"revision\":\"$EXPECTED_REVISION\",\"prune\":false}}}"
fi
```

Wait for that exact operation and the frontend rollout:

```bash
for attempt in {1..60}; do
  PHASE="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.status.operationState.phase}'
  )"
  OPERATION_REVISION="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.status.operationState.syncResult.revision}'
  )"
  test "$PHASE" = Succeeded \
    && test "$OPERATION_REVISION" = "$EXPECTED_REVISION" \
    && break
  test "$PHASE" = Failed -o "$PHASE" = Error \
    && { echo "STOP: Argo CD operation ended in $PHASE" >&2; break; }
  sleep 5
done

if test "$PHASE" = Succeeded \
  && test "$OPERATION_REVISION" = "$EXPECTED_REVISION"; then
  echo 'Exact-revision sync succeeded'
else
  echo 'STOP: exact-revision sync did not succeed' >&2
fi

kubectl rollout status -n arcana deployment/arcana-frontend --timeout=5m

kubectl get deployment -n arcana arcana-frontend \
  -o jsonpath='desiredImage={.spec.template.spec.containers[0].image}{"\n"}'

kubectl get pods -n arcana \
  -l app.kubernetes.io/name=arcana-frontend \
  -o custom-columns='NAME:.metadata.name,READY:.status.containerStatuses[*].ready,RESTARTS:.status.containerStatuses[*].restartCount,IMAGE:.spec.containers[*].image,IMAGE_ID:.status.containerStatuses[*].imageID'
```

Finally, re-run strict public canary checks:

```bash
curl -H 'X-Arcana-Canary: k3s' \
  -fsS -o /dev/null \
  -w 'backend_public_canary_http=%{http_code}\n' \
  https://backend-arcanaai.nguyenvanloc.com/api/health/

curl -H 'X-Arcana-Canary: k3s' \
  -fsS -o /dev/null \
  -w 'frontend_public_canary_http=%{http_code} redirect=%{redirect_url}\n' \
  https://arcanaai.nguyenvanloc.com/
```

Require backend HTTP 200, frontend HTTP 200 with no redirect, the corrected
frontend image tag, a ready Pod with zero restarts, and automated sync still
`false`. Ordinary production traffic remains on Docker.

The GitOps revision `3dc832c81324f22517c2674f1ac61521f12f2694`
synchronized successfully. The corrected frontend Pod became ready with zero
restarts, and strict public canary checks returned HTTP 200 for both backend
and frontend with no frontend redirect. The previous frontend Pod was still
visible immediately after rollout while terminating; confirm it disappears
before production cutover. Local validation did not run because `ksops` was
missing on the MacBook, but Argo CD's pinned KSOPS renderer succeeded. Install
the matching local version and repeat the render before cutover.

### 41.12 Install pinned local KSOPS and close the canary checkpoint

**Run on: current administration workstation (the MacBook).**

First check the existing KSOPS executable. The installed CLI does not expose a
`--version` or `version` command; those arguments are interpreted as manifest
paths, so do not use them as a version probe:

```bash
command -v ksops
ls -l "$(command -v ksops)"
file "$(command -v ksops)"
```

Repeat the render using an explicit temporary file so a renderer failure or
zero-resource result cannot be hidden by a pipeline. Put the render in a file
whose name ends in `.yaml`; `kubeconform` skips an extensionless file when it
is passed as a filesystem argument:

```bash
cd /Users/vanloc1808/Projects/arcana-deployment
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"

RENDER_DIRECTORY="$(mktemp -d)"
RENDER_FILE="$RENDER_DIRECTORY/production.yaml"

if kustomize build \
  --enable-alpha-plugins \
  --enable-exec \
  apps/arcana/overlays/production \
  >"$RENDER_FILE"; then
  RESOURCE_COUNT="$(rg -c '^apiVersion:' "$RENDER_FILE")"
  printf 'Rendered resources: %s\n' "$RESOURCE_COUNT"

  if test "$RESOURCE_COUNT" -gt 0; then
    kubeconform -strict -summary -exit-on-error "$RENDER_FILE"
    rg 'image:' "$RENDER_FILE" | sort -u
  else
    echo 'STOP: render produced zero resources' >&2
  fi
else
  echo 'STOP: production render failed' >&2
fi

if test -n "$RENDER_FILE" && test -f "$RENDER_FILE"; then
  rm -f -- "$RENDER_FILE"
  echo 'Removed temporary decrypted render'
fi

if test -n "$RENDER_DIRECTORY" \
  && test -d "$RENDER_DIRECTORY"; then
  rmdir -- "$RENDER_DIRECTORY"
fi
```

Confirm the old frontend Pod has terminated and explain any remaining Argo CD
`Progressing` state without changing it:

```bash
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"

kubectl get pods -n arcana \
  -l app.kubernetes.io/name=arcana-frontend \
  -o custom-columns='NAME:.metadata.name,READY:.status.containerStatuses[*].ready,PHASE:.status.phase,DELETION:.metadata.deletionTimestamp,RESTARTS:.status.containerStatuses[*].restartCount,IMAGE:.spec.containers[*].image'

kubectl get application -n argocd arcana-production \
  -o jsonpath='sync={.status.sync.status}{"\n"}health={.status.health.status}{"\n"}revision={.status.sync.revision}{"\n"}enabled={.spec.syncPolicy.automated.enabled}{"\n"}operation={.operation}{"\n"}'

kubectl get application -n argocd arcana-production \
  -o jsonpath='{range .status.resources[*]}{.kind}{"\t"}{.namespace}{"\t"}{.name}{"\t"}{.status}{"\t"}{.health.status}{"\t"}{.health.message}{"\n"}{end}' \
  | sort
```

Require one corrected frontend Pod, ready with zero restarts; a non-empty valid
render; `Synced`; automated sync `false`; and no active operation. A
`Progressing` Application is acceptable only if the resource inventory proves
it comes solely from the intentionally unbound Beat PVC.

This checkpoint passed. The local KSOPS executable is an ARM64 Mach-O binary;
the production overlay rendered 16 resources; kubeconform validated all 16;
and the temporary decrypted render was removed. The cluster has exactly one
corrected frontend Pod, ready with zero restarts. Argo CD is synced to
`3dc832c81324f22517c2674f1ac61521f12f2694`, automated sync remains disabled,
and no operation is active. The Application remains `Progressing`; close that
last status question by checking the intentionally inactive Beat workload and
its delayed-binding claim.

### 41.13 Explain the remaining Argo CD Progressing state

**Run on: current administration workstation (the MacBook).**

```bash
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"

kubectl get deployment -n arcana arcana-celery-beat \
  -o custom-columns='NAME:.metadata.name,DESIRED:.spec.replicas,READY:.status.readyReplicas,AVAILABLE:.status.availableReplicas'

kubectl get pvc -n arcana \
  -o custom-columns='NAME:.metadata.name,STATUS:.status.phase,VOLUME:.spec.volumeName,STORAGE_CLASS:.spec.storageClassName,CAPACITY:.status.capacity.storage'

kubectl describe pvc -n arcana arcana-celery-beat-data \
  | sed -n '/^Status:/p;/^StorageClass:/p;/^Used By:/p;/WaitForFirstConsumer/p'

kubectl get pods -n arcana \
  -o custom-columns='NAME:.metadata.name,READY:.status.containerStatuses[*].ready,PHASE:.status.phase,RESTARTS:.status.containerStatuses[*].restartCount'
```

Require Beat desired replicas `0`, its PVC `Pending` with
`WaitForFirstConsumer`, the avatar PVC `Bound`, and every active Pod ready with
zero restarts. That combination explains `Progressing` without indicating an
application failure; the Beat claim will bind only after the Docker scheduler
is retired and the Kubernetes scheduler is deliberately scaled to one.

The observed state matched that boundary exactly: Beat desired replicas were
zero, its delayed-binding PVC was Pending with no consumer, the avatar and
Redis PVCs were Bound, and every active Pod was ready with zero restarts. The
Application's `Progressing` state is therefore expected and does not block the
reversible web-traffic cutover.

### 41.14 Switch ordinary web traffic to K3s

**Run on: VPS.**

Keep the existing canary file unchanged. Create a separate production overlay
that adds two higher-priority host-only routers to the same carrier. Those
routers reuse the already healthy canary services and ClusterIP targets:

```bash
if sudo test -e /root/traefik/arcana-k3s-production.yaml; then
  echo 'STOP: production routing overlay already exists' >&2
else
  sudo tee /root/traefik/arcana-k3s-production.yaml >/dev/null <<'YAML'
services:
  arcana-k3s-router:
    labels:
      traefik.http.routers.arcana-k3s-backend-production.rule: "Host(`backend-tarotreader.nguyenvanloc.com`) || Host(`backend-arcanaai.nguyenvanloc.com`) || Host(`backend.stacyn.io.vn`)"
      traefik.http.routers.arcana-k3s-backend-production.entrypoints: websecure
      traefik.http.routers.arcana-k3s-backend-production.tls: "true"
      traefik.http.routers.arcana-k3s-backend-production.priority: "9000"
      traefik.http.routers.arcana-k3s-backend-production.service: arcana-k3s-backend-canary

      traefik.http.routers.arcana-k3s-frontend-production.rule: "Host(`tarot-reader.nguyenvanloc.com`) || Host(`arcanaai.nguyenvanloc.com`) || Host(`stacyn.io.vn`)"
      traefik.http.routers.arcana-k3s-frontend-production.entrypoints: websecure
      traefik.http.routers.arcana-k3s-frontend-production.tls: "true"
      traefik.http.routers.arcana-k3s-frontend-production.priority: "9000"
      traefik.http.routers.arcana-k3s-frontend-production.service: arcana-k3s-frontend-canary
YAML
fi
```

Validate all three files, preview the targeted carrier recreation, and record
the edge identity:

```bash
sudo docker compose \
  -f /root/traefik/docker-compose.yaml \
  -f /root/traefik/arcana-k3s-canary.yaml \
  -f /root/traefik/arcana-k3s-production.yaml \
  config -q

sudo docker compose \
  -f /root/traefik/docker-compose.yaml \
  -f /root/traefik/arcana-k3s-canary.yaml \
  -f /root/traefik/arcana-k3s-production.yaml \
  config \
  | grep -E 'arcana-k3s-(backend|frontend)-production'

TRAEFIK_ID_BEFORE="$(docker inspect traefik --format '{{.Id}}')"
TRAEFIK_STARTED_BEFORE="$(docker inspect traefik --format '{{.State.StartedAt}}')"

sudo docker compose \
  -f /root/traefik/docker-compose.yaml \
  -f /root/traefik/arcana-k3s-canary.yaml \
  -f /root/traefik/arcana-k3s-production.yaml \
  --dry-run up -d --no-deps arcana-k3s-router
```

Activate only the carrier and require Traefik to retain its identity:

```bash
sudo docker compose \
  -f /root/traefik/docker-compose.yaml \
  -f /root/traefik/arcana-k3s-canary.yaml \
  -f /root/traefik/arcana-k3s-production.yaml \
  up -d --no-deps arcana-k3s-router

TRAEFIK_ID_AFTER="$(docker inspect traefik --format '{{.Id}}')"
TRAEFIK_STARTED_AFTER="$(docker inspect traefik --format '{{.State.StartedAt}}')"

if test "$TRAEFIK_ID_BEFORE" = "$TRAEFIK_ID_AFTER" \
  && test "$TRAEFIK_STARTED_BEFORE" = "$TRAEFIK_STARTED_AFTER"; then
  echo 'Production Traefik was not recreated or restarted'
else
  echo 'STOP: production Traefik identity changed' >&2
fi
```

Confirm the new routers, send normal requests without the canary header, and
prove the access log selected the production K3s routers:

```bash
docker exec tarot-backend \
  curl -fsS http://traefik:8080/api/http/routers \
  | python3 -c '
import json, sys
for item in json.load(sys.stdin):
    if item.get("name", "").startswith("arcana-k3s-") and "production" in item.get("name", ""):
        print("name={} status={} priority={} service={}".format(
            item.get("name"), item.get("status"), item.get("priority"), item.get("service")
        ))
'

curl -fsS -o /dev/null \
  -w 'backend_production_http=%{http_code}\n' \
  https://backend-arcanaai.nguyenvanloc.com/api/health/

curl -fsS -o /dev/null \
  -w 'frontend_production_http=%{http_code} redirect=%{redirect_url}\n' \
  https://arcanaai.nguyenvanloc.com/

docker logs traefik --since 5m 2>&1 \
  | grep -E 'arcana-k3s-(backend|frontend)-production@docker' \
  | grep -E '"(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) ' \
  | tail -n 20
```

Require two enabled priority-9000 routers, HTTP 200 for both requests, no
frontend redirect, and access-log entries showing the production routers and
K3s ClusterIP upstreams. Docker backend, frontend, worker, Redis, and Beat stay
running during this observation window.

If any cutover check fails, immediately restore canary-only labels by targeting
the carrier with only the original two Compose files:

```bash
sudo docker compose \
  -f /root/traefik/docker-compose.yaml \
  -f /root/traefik/arcana-k3s-canary.yaml \
  up -d --no-deps arcana-k3s-router

curl -fsS -o /dev/null \
  -w 'rollback_backend_http=%{http_code}\n' \
  https://backend-arcanaai.nguyenvanloc.com/api/health/

curl -fsS -o /dev/null \
  -w 'rollback_frontend_http=%{http_code}\n' \
  https://arcanaai.nguyenvanloc.com/
```

This rollback removes only the production carrier labels; it preserves the
header-gated canary routes and does not restart Traefik.

The production web cutover passed. Both host-only routers are enabled at
priority 9000, backend and frontend returned HTTP 200 through public DNS, and
Traefik access logs showed ordinary Cloudflare traffic routed through
`arcana-k3s-backend-production@docker` and
`arcana-k3s-frontend-production@docker` to the expected K3s ClusterIPs. Keep
the Docker application containers running while the remaining worker and
scheduler migration proceeds.

### 41.15 Prepare the Kubernetes Beat activation revision

**Run on: current administration workstation (the MacBook).**

This subsection changes Git only. It must not sync Argo CD or stop Docker Beat.
Update the production replica override from zero to one:

```bash
cd /Users/vanloc1808/Projects/arcana-deployment

if test -n "$(git status --short)"; then
  echo 'STOP: deployment repository is not clean' >&2
else
  cd apps/arcana/overlays/production
  kustomize edit set replicas arcana-celery-beat=1
  cd ../../../..
fi

git diff -- apps/arcana/overlays/production/kustomization.yaml
git diff --check
```

Require the only semantic change to be Beat count `0` to `1`. Render and
validate through the local KSOPS executable using a `.yaml` file:

```bash
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"

RENDER_DIRECTORY="$(mktemp -d)"
RENDER_FILE="$RENDER_DIRECTORY/production.yaml"

if kustomize build \
  --enable-alpha-plugins \
  --enable-exec \
  apps/arcana/overlays/production \
  >"$RENDER_FILE"; then
  RESOURCE_COUNT="$(rg -c '^apiVersion:' "$RENDER_FILE")"
  printf 'Rendered resources: %s\n' "$RESOURCE_COUNT"
  kubeconform -strict -summary -exit-on-error "$RENDER_FILE"
  rg -n 'name: arcana-celery-beat|replicas: 1' "$RENDER_FILE"
else
  echo 'STOP: production render failed' >&2
fi

if test -n "$RENDER_FILE" && test -f "$RENDER_FILE"; then
  rm -f -- "$RENDER_FILE"
  echo 'Removed temporary decrypted render'
fi

if test -n "$RENDER_DIRECTORY" \
  && test -d "$RENDER_DIRECTORY"; then
  rmdir -- "$RENDER_DIRECTORY"
fi
```

Commit and push the inert desired-state change, then let Argo CD observe it
without synchronizing:

```bash
git add apps/arcana/overlays/production/kustomization.yaml
git diff --cached --check
git diff --cached --stat
git commit -m 'deploy: prepare Kubernetes Celery Beat activation'
git push origin main

export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"
EXPECTED_REVISION="$(git rev-parse HEAD)"

kubectl annotate application -n argocd arcana-production \
  argocd.argoproj.io/refresh=hard \
  --overwrite

for attempt in {1..60}; do
  OBSERVED_REVISION="$(
    kubectl get application -n argocd arcana-production \
      -o jsonpath='{.status.sync.revision}'
  )"
  test "$OBSERVED_REVISION" = "$EXPECTED_REVISION" && break
  sleep 5
done

kubectl get application -n argocd arcana-production \
  -o jsonpath='sync={.status.sync.status}{"\n"}health={.status.health.status}{"\n"}revision={.status.sync.revision}{"\n"}enabled={.spec.syncPolicy.automated.enabled}{"\n"}operation={.operation}{"\n"}'

kubectl get deployment -n arcana arcana-celery-beat \
  -o custom-columns='NAME:.metadata.name,LIVE_REPLICAS:.spec.replicas'
```

Require Argo CD to observe the new revision as `OutOfSync`, automated sync to
remain `false`, no active operation, and the live Beat Deployment to remain at
zero. Do not stop Docker Beat or synchronize this revision until the singleton
scheduler handoff subsection.

The prepared revision `b084a6942bd1f92e0e1066333a49968647d99640`
rendered and validated all 16 resources. Argo CD observed it as OutOfSync with
automation disabled and no active operation, while live Kubernetes Beat
remained at zero.

### 41.16 Hand off the singleton Celery Beat scheduler

**Run on: current administration workstation (the MacBook).**

Perform the handoff through a shell function so a failure returns to the
interactive prompt instead of closing the terminal. The rollback helper first
scales Kubernetes Beat to zero and only then restarts Docker Beat, preventing
two schedulers from running together:

```bash
arcana_beat_handoff() {
  cd /Users/vanloc1808/Projects/arcana-deployment || return 1
  export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"

  EXPECTED_REVISION="$(git rev-parse HEAD)" || return 1
  OBSERVED_REVISION="$(kubectl get application -n argocd arcana-production -o jsonpath='{.status.sync.revision}')" || return 1
  AUTOMATED_ENABLED="$(kubectl get application -n argocd arcana-production -o jsonpath='{.spec.syncPolicy.automated.enabled}')" || return 1
  ACTIVE_OPERATION="$(kubectl get application -n argocd arcana-production -o jsonpath='{.operation}')" || return 1
  LIVE_BEAT_REPLICAS="$(kubectl get deployment -n arcana arcana-celery-beat -o jsonpath='{.spec.replicas}')" || return 1
  DOCKER_BEAT_STATUS="$(ssh vps docker inspect tarot-celery-beat --format '{{.State.Status}}')" || return 1

  if test "$EXPECTED_REVISION" != "$OBSERVED_REVISION" \
    || test "$AUTOMATED_ENABLED" != false \
    || test -n "$ACTIVE_OPERATION" \
    || test "$LIVE_BEAT_REPLICAS" != 0 \
    || test "$DOCKER_BEAT_STATUS" != running; then
    echo 'STOP: Beat handoff preconditions are not satisfied' >&2
    return 1
  fi

  ssh vps docker stop tarot-celery-beat || return 1

  kubectl patch application -n argocd arcana-production \
    --type=merge \
    --patch "{\"operation\":{\"initiatedBy\":{\"username\":\"celery-beat-handoff-guide\"},\"sync\":{\"revision\":\"$EXPECTED_REVISION\",\"prune\":false}}}" \
    || {
      ssh vps docker start tarot-celery-beat
      return 1
    }

  PHASE=""
  OPERATION_REVISION=""

  for attempt in {1..60}; do
    PHASE="$(kubectl get application -n argocd arcana-production -o jsonpath='{.status.operationState.phase}')" || break
    OPERATION_REVISION="$(kubectl get application -n argocd arcana-production -o jsonpath='{.status.operationState.syncResult.revision}')" || break

    test "$PHASE" = Succeeded \
      && test "$OPERATION_REVISION" = "$EXPECTED_REVISION" \
      && break

    test "$PHASE" = Failed -o "$PHASE" = Error && break
    sleep 5
  done

  if test "$PHASE" != Succeeded \
    || test "$OPERATION_REVISION" != "$EXPECTED_REVISION"; then
    echo 'Beat sync failed; restoring Docker Beat' >&2
    kubectl scale deployment -n arcana arcana-celery-beat --replicas=0
    kubectl rollout status deployment/arcana-celery-beat -n arcana --timeout=2m
    ssh vps docker start tarot-celery-beat
    return 1
  fi

  if ! kubectl rollout status deployment/arcana-celery-beat -n arcana --timeout=5m; then
    echo 'Kubernetes Beat rollout failed; restoring Docker Beat' >&2
    kubectl scale deployment -n arcana arcana-celery-beat --replicas=0
    kubectl rollout status deployment/arcana-celery-beat -n arcana --timeout=2m
    ssh vps docker start tarot-celery-beat
    return 1
  fi

  kubectl get pods -n arcana \
    -l app.kubernetes.io/name=arcana-celery-beat \
    -o custom-columns='NAME:.metadata.name,READY:.status.containerStatuses[*].ready,PHASE:.status.phase,RESTARTS:.status.containerStatuses[*].restartCount,IMAGE:.spec.containers[*].image'

  kubectl get pvc -n arcana arcana-celery-beat-data -o wide
  kubectl logs -n arcana deployment/arcana-celery-beat --tail=50
  ssh vps docker inspect tarot-celery-beat --format 'docker_beat_status={{.State.Status}}'

  kubectl annotate application -n argocd arcana-production \
    argocd.argoproj.io/refresh=hard --overwrite

  kubectl get application -n argocd arcana-production \
    -o jsonpath='sync={.status.sync.status}{"\n"}health={.status.health.status}{"\n"}revision={.status.sync.revision}{"\n"}enabled={.spec.syncPolicy.automated.enabled}{"\n"}operation={.operation}{"\n"}'

  echo 'Celery Beat singleton handoff completed'
}

arcana_beat_handoff
BEAT_HANDOFF_RESULT="$?"
unset -f arcana_beat_handoff
printf 'Beat handoff result: %s\n' "$BEAT_HANDOFF_RESULT"
```

Require one ready Kubernetes Beat Pod with zero restarts, a Bound Beat PVC,
scheduler startup in its logs, Docker Beat `exited`, Argo CD Synced at the exact
revision, automated sync still false, and no active operation. Keep the Docker
worker and Redis running until their old broker queue is inspected and drained.

The singleton handoff passed at revision
`b084a6942bd1f92e0e1066333a49968647d99640`. Kubernetes Beat is ready with
zero restarts, its 256 MiB schedule PVC is Bound, and logs show Celery 5.6.3
using `redis://arcana-redis:6379/0` with the persistent scheduler database.
Docker Beat is exited. Argo CD is Synced and Healthy with automation disabled
and no active operation.

### 41.17 Inspect and drain the old Docker task broker

**Run on: VPS.**

Do not print task payloads or Redis values. Inspect only queue lengths,
unacknowledged counts, and the Docker worker's task summaries:

```bash
docker inspect tarot-celery-worker \
  --format 'worker_status={{.State.Status}} started={{.State.StartedAt}}'

docker inspect tarot-redis \
  --format 'redis_status={{.State.Status}} started={{.State.StartedAt}}'

docker exec tarot-redis redis-cli -n 0 LLEN celery
docker exec tarot-redis redis-cli -n 0 HLEN unacked
docker exec tarot-redis redis-cli -n 0 ZCARD unacked_index

docker exec tarot-celery-worker \
  /app/.venv/bin/celery -A celery_app inspect active --timeout=5

docker exec tarot-celery-worker \
  /app/.venv/bin/celery -A celery_app inspect reserved --timeout=5

docker exec tarot-celery-worker \
  /app/.venv/bin/celery -A celery_app inspect scheduled --timeout=5
```

Require queue length zero, both unacknowledged counts zero, and empty active,
reserved, and scheduled task lists. If any count or list is non-empty, leave
the Docker worker and Redis running and repeat after the tasks finish. Do not
stop Docker Redis, worker, backend, or frontend during this inspection.

The old broker was completely drained: queue, unacknowledged hash, and
unacknowledged index counts were all zero, and the sole Docker worker reported
empty active, reserved, and scheduled lists.

### 41.18 Retire the old Arcana Docker runtime

**Run on: VPS.**

Stop, but do not remove, the drained worker and the web containers that no
longer receive production traffic. Stop their Redis last:

```bash
docker stop tarot-celery-worker
docker stop tarot-backend tarot-frontend
docker stop tarot-redis

docker inspect \
  tarot-celery-beat \
  tarot-celery-worker \
  tarot-backend \
  tarot-frontend \
  tarot-redis \
  --format '{{.Name}}={{.State.Status}}'
```

Require all five containers to be exited. Keep them present as rollback
artifacts. Confirm Kubernetes remains healthy and public traffic still selects
the K3s production routers:

```bash
sudo k3s kubectl get pods -n arcana \
  -o custom-columns='NAME:.metadata.name,READY:.status.containerStatuses[*].ready,PHASE:.status.phase,RESTARTS:.status.containerStatuses[*].restartCount'

curl -fsS -o /dev/null \
  -w 'backend_after_docker_retirement=%{http_code}\n' \
  https://backend-arcanaai.nguyenvanloc.com/api/health/

curl -fsS -o /dev/null \
  -w 'frontend_after_docker_retirement=%{http_code} redirect=%{redirect_url}\n' \
  https://arcanaai.nguyenvanloc.com/

docker logs traefik --since 5m 2>&1 \
  | grep -E 'arcana-k3s-(backend|frontend)-production@docker' \
  | grep -E '"(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) ' \
  | tail -n 20
```

Require every Kubernetes Pod ready with zero restarts, both public requests
HTTP 200, and access logs naming the production K3s routers and ClusterIP
upstreams.

If a web check fails, restore the stopped Docker runtime and canary-only
routing in this order:

```bash
docker start tarot-redis
docker start tarot-celery-worker tarot-backend tarot-frontend

sudo docker compose \
  -f /root/traefik/docker-compose.yaml \
  -f /root/traefik/arcana-k3s-canary.yaml \
  up -d --no-deps arcana-k3s-router

curl -fsS -o /dev/null \
  -w 'rollback_backend_http=%{http_code}\n' \
  https://backend-arcanaai.nguyenvanloc.com/api/health/

curl -fsS -o /dev/null \
  -w 'rollback_frontend_http=%{http_code}\n' \
  https://arcanaai.nguyenvanloc.com/
```

Do not restart Docker Beat during a web-only rollback; Kubernetes Beat is now
the active singleton scheduler. Do not remove Docker containers or volumes
until the later rollback-retention window has elapsed.

The Docker retirement passed. Beat, worker, backend, frontend, and Redis are
all exited but retained. All five Kubernetes Pods are ready with zero
restarts, both public requests returned HTTP 200, and Traefik access logs prove
ordinary traffic continues through the K3s production routers and ClusterIP
upstreams.

### 41.19 Enable automated Argo CD reconciliation

**Run on: current administration workstation (the MacBook).**

The Docker rollback artifacts are retained and the Kubernetes stack is now
fully healthy. Enable the already configured automated policy in Git by
changing only `enabled: false` to `enabled: true` in the bootstrap Application:

```bash
cd /Users/vanloc1808/Projects/arcana-deployment

if test -n "$(git status --short)"; then
  echo 'STOP: deployment repository is not clean' >&2
else
  sed -i '' \
    's/^      enabled: false$/      enabled: true/' \
    bootstrap/argocd/arcana-production.yaml
fi

git diff -- bootstrap/argocd/arcana-production.yaml
git diff --check

rg -n 'enabled:|prune:|selfHeal:|allowEmpty:|PruneLast' \
  bootstrap/argocd/arcana-production.yaml
```

Require exactly one semantic change: `enabled` becomes true while `prune`,
`selfHeal`, and `PruneLast` retain their reviewed values and `allowEmpty`
remains false. Commit and push:

```bash
git add bootstrap/argocd/arcana-production.yaml
git diff --cached --check
git diff --cached --stat
git commit -m 'deploy: enable automated Arcana reconciliation'
git push origin main
```

The bootstrap file is outside the Application's managed source path, so apply
that reviewed Application object explicitly and verify the resulting policy:

```bash
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"

kubectl diff -f bootstrap/argocd/arcana-production.yaml || true
kubectl apply -f bootstrap/argocd/arcana-production.yaml

kubectl get application -n argocd arcana-production \
  -o jsonpath='sync={.status.sync.status}{"\n"}health={.status.health.status}{"\n"}revision={.status.sync.revision}{"\n"}enabled={.spec.syncPolicy.automated.enabled}{"\n"}prune={.spec.syncPolicy.automated.prune}{"\n"}selfHeal={.spec.syncPolicy.automated.selfHeal}{"\n"}allowEmpty={.spec.syncPolicy.automated.allowEmpty}{"\n"}operation={.operation}{"\n"}'

kubectl get pods -n arcana \
  -o custom-columns='NAME:.metadata.name,READY:.status.containerStatuses[*].ready,PHASE:.status.phase,RESTARTS:.status.containerStatuses[*].restartCount'
```

Require Synced, Healthy, enabled/prune/selfHeal true, allowEmpty false, no
active operation, and every Pod ready with zero restarts. From this point,
merged Git changes under the production overlay reconcile automatically; use
Git reverts rather than live edits for normal rollback.

The final policy check passed. Argo CD is Synced and Healthy at revision
`b084a6942bd1f92e0e1066333a49968647d99640`; automated synchronization,
pruning, and self-healing are enabled; allowEmpty is false; no operation is
active; and all five production Pods are ready with zero restarts. The core
ArcanaAI K3s and Argo CD migration is complete.

## 42. Company-laptop continuation prompt

After both repositories and the Age identity are available on the company
laptop, paste the following prompt into the new assistant session:

```text
Continue guiding me through the ArcanaAI GitOps deployment. Read
docs/arcana-deployment-repository-setup.md in the arcana-ai repository before
giving me the next command.

Current state:
- The application repository is arcana-ai.
- The separate GitOps repository is arcana-deployment.
- GitHub Actions publishes SHA-tagged public images to Docker Hub.
- Docker Traefik remains the public edge on ports 80 and 443. Its separate
  routing carrier forwards ordinary Arcana traffic to the K3s ClusterIP
  Services. Do not restart or replace production Traefik.
- The VPS has about 18 GiB free, with 10 GiB as the stop-and-investigate floor.
- K3s v1.36.3+k3s1 is installed and healthy; the node is Ready and the core
  system workloads are Running.
- Argo CD v3.4.5 is installed and healthy with internal ClusterIP Services
  only; no Argo CD Ingress exists.
- Argo CD has read-only access to the private deployment repository through a
  dedicated GitHub deploy key.
- KSOPS v4.5.1 is installed as an isolated repo-server sidecar with the Age
  identity mounted from an encrypted-at-rest Kubernetes Secret.
- The `arcana-production` Application is Synced and Healthy. Automated sync,
  pruning, and self-healing are enabled; allowEmpty is false.
- GitOps revision `b084a6942bd1f92e0e1066333a49968647d99640` runs the
  backend, corrected frontend, Redis StatefulSet, one non-root concurrency-one
  worker, and one singleton Beat scheduler. All five Pods are ready with zero
  restarts.
- The avatar, Redis, and Beat schedule PVCs are Bound. The avatar claim is
  pruning-protected and retained its seeded production data.
- Docker Beat, worker, backend, frontend, and Arcana Redis are exited but
  retained as rollback artifacts. Their old broker was drained before stop.
  Do not remove their containers or volumes until a deliberate retention
  decision is recorded.
- `/root/traefik/arcana-k3s-canary.yaml` and
  `/root/traefik/arcana-k3s-production.yaml` provide the host routing bridge.
  Preserve and version their non-secret definitions before treating the host
  configuration as fully reproducible.
- K3s packaged Traefik and ServiceLB remain disabled. No Kubernetes Ingress is
  used while Docker Traefik owns ports 80 and 443.
- TCP 6443 is not open publicly; workstation kubectl access uses an SSH
  local-forward and a dedicated kubeconfig at `~/.kube/arcana-k3s.yaml`.
- My SOPS Age identity is stored outside Git at
  ~/.config/sops/age/keys.txt on this laptop.
- This administration workstation uses its own write-enabled,
  repository-scoped deploy key. It does not reuse Argo CD's read-only deploy
  key.

Before any SOPS command, I will run:
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"
test -r "$SOPS_AGE_KEY_FILE"
age-keygen -y "$SOPS_AGE_KEY_FILE"

Resume after Section 41.19. The production migration is complete. Next, make
the host-side Traefik routing bridge reproducible in the deployment repository,
define the rollback-artifact retention window, and review monitoring and
backup coverage. Give me one subsection at a time.
Whenever you add instructions to this Markdown guide, put an explicit
`Run on: VPS` or `Run on: current administration workstation` line before the
commands. Do not use ambiguous locations such as `local machine`; clearly say
whether each command runs through SSH on the VPS or directly on my current
computer.
Do not use `set -e`, `set -u`, or `set -eu` in commands. Do not run deployment
commands on my behalf, expose secrets, change the firewall, modify another
user's container, remove rollback artifacts, or take over ports 80/443. If
output is unexpected, stop and diagnose it before continuing.
```

The prompt contains the key path but never the private key. On the company
laptop, first update both repositories with:

```bash
git -C /path/to/arcana-ai pull --ff-only origin main
git -C /path/to/arcana-deployment pull --ff-only origin main
```

## Primary references

- [GitHub: Creating a new repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)
- [GitHub: Cloning a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository)
- [Kubernetes: Declarative management with Kustomize](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/)
- [Kubernetes: Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes: Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes: StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Kubernetes: Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes: Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes: Liveness, readiness, and startup probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Kubernetes: Resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [K3s: Installation requirements](https://docs.k3s.io/installation/requirements)
- [K3s: Installation configuration](https://docs.k3s.io/installation/configuration)
- [K3s: Secrets encryption](https://docs.k3s.io/security/secrets-encryption)
- [K3s: Basic network options](https://docs.k3s.io/networking/basic-network-options)
- [K3s: Networking services and packaged Traefik](https://docs.k3s.io/networking/networking-services)
- [SOPS: Official repository and usage reference](https://github.com/getsops/sops)
- [KSOPS: Official repository and Argo CD integration](https://github.com/viaduct-ai/kustomize-sops)
- [KSOPS v4.5.1 release](https://github.com/viaduct-ai/kustomize-sops/releases/tag/v4.5.1)
- [Age: Official repository](https://github.com/FiloSottile/age)
- [Argo CD: Config management plugins](https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/)
- [Argo CD: Private repositories](https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/)
- [Argo CD: Application specification](https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/)
- [Argo CD: Automated sync policy](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/)
- [GitHub: Managing deploy keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)
- [Docker Hub: Redis official image](https://hub.docker.com/_/redis)
- [Traefik: Docker routing labels](https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/)
- [Supabase: Database backups](https://supabase.com/docs/guides/platform/backups)
