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

## 27. Company-laptop continuation prompt

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
- The production VPS currently runs Docker Compose and Docker Traefik on ports
  80 and 443; do not interrupt them.
- The VPS has about 18 GiB free, with 10 GiB as the stop-and-investigate floor.
- K3s v1.36.3+k3s1 is installed and healthy; the node is Ready and the core
  system workloads are Running.
- Argo CD v3.4.5 is installed and healthy with internal ClusterIP Services
  only; no Argo CD Ingress exists.
- Argo CD has read-only access to the private deployment repository through a
  dedicated GitHub deploy key.
- KSOPS v4.5.1 is installed as an isolated repo-server sidecar with the Age
  identity mounted from an encrypted-at-rest Kubernetes Secret.
- The `arcana-production` Application exists in observation-only mode with
  automated synchronization disabled; private Git and KSOPS rendering are
  verified, and no `arcana` namespace or workload has been created.
- Argo CD renders deployment commit
  `100674f883cd3144a7f622e21ee91e06dc6cc5f7` as 15 desired resources with no
  conditions, but none has been synchronized.
- Desired state contains the backend, persistent Redis, frontend, one
  concurrency-one Celery worker, one Celery Beat scheduler, retained Beat
  schedule storage, and internal Services. Production Kustomize replacement
  was verified offline: backend and frontend use the pinned commit SHA, Redis
  uses `redis:7.4.10-alpine`, and no rendered image uses `:latest`.
- A transient Docker workload owned by another VPS user was consuming most of
  the six-core server. Do not modify it. Recheck capacity after it ends before
  considering any synchronization.
- K3s packaged Traefik and ServiceLB must remain disabled during staging.
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

Resume after Section 26.12. First reconcile both repositories and recheck the
transient VPS CPU load. Then guide me through designing a dedicated Argo CD
migration Job before any synchronization. Give me one subsection at a time.
Do not run deployment commands on my behalf, expose secrets, change the
firewall, stop Docker, modify another user's container, synchronize the
Application, or take over ports 80/443. If output is unexpected, stop and
diagnose it before continuing.
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
