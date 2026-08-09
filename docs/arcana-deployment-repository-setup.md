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

## 19. Company-laptop handoff prompt

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
- K3s v1.36.3+k3s1 was selected from the stable channel but Section 18 has not
  been run yet.
- K3s packaged Traefik and ServiceLB must remain disabled during staging.
- TCP 6443 must not be opened publicly; Mac kubectl access will use an SSH
  local-forward.
- My SOPS Age identity is stored outside Git at
  ~/.config/sops/age/keys.txt on this laptop.

Before any SOPS command, I will run:
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"
test -r "$SOPS_AGE_KEY_FILE"
age-keygen -y "$SOPS_AGE_KEY_FILE"

Resume at Section 18.1. Give me one subsection at a time. Do not run commands
on my behalf, expose secrets, change the firewall, stop Docker, or take over
ports 80/443. If output is unexpected, stop and diagnose it before continuing.
```

The prompt contains the key path but never the private key. On the company
laptop, first update this guide with:

```bash
git pull origin main
```

## Primary references

- [GitHub: Creating a new repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)
- [GitHub: Cloning a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository)
- [Kubernetes: Declarative management with Kustomize](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/)
- [Kubernetes: Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes: Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes: Liveness, readiness, and startup probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Kubernetes: Resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [K3s: Installation requirements](https://docs.k3s.io/installation/requirements)
- [K3s: Installation configuration](https://docs.k3s.io/installation/configuration)
- [K3s: Secrets encryption](https://docs.k3s.io/security/secrets-encryption)
- [K3s: Basic network options](https://docs.k3s.io/networking/basic-network-options)
- [K3s: Networking services and packaged Traefik](https://docs.k3s.io/networking/networking-services)
- [SOPS: Official repository and usage reference](https://github.com/getsops/sops)
- [Age: Official repository](https://github.com/FiloSottile/age)
- [Argo CD: Config management plugins](https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/)
- [Argo CD: Application specification](https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/)
- [Argo CD: Automated sync policy](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/)
