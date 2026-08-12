# Production configuration and secret rotation

This guide explains how to change ArcanaAI production configuration in the current GitOps setup.

The important rule is:

```text
Edit Git -> validate -> commit and push -> review in Argo CD -> manually sync
```

Do not treat the live Kubernetes object as the source of truth. Git in
`arcana-deployment` is the source of truth; Argo CD applies that desired state.

## Which file should change?

Use a regular ConfigMap for non-sensitive configuration such as feature flags,
hostnames, ports, and public runtime settings:

```text
apps/arcana/base/backend-configmap.yaml
```

Use the SOPS-encrypted Secret for credentials and sensitive values such as API
keys, passwords, JWT signing keys, webhook secrets, and database credentials:

```text
apps/arcana/overlays/production/backend-secret.sops.yaml
```

ConfigMaps are not encrypted. Never put a password, token, private key, or
credential into a ConfigMap merely because it is easier to edit.

## Workstation prerequisites

Run these commands on a trusted administration workstation, not inside an
application Pod:

```bash
cd "$HOME/Personal/arcana-deployment"
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"

test -r "$SOPS_AGE_KEY_FILE"
test "$(stat -c '%a' "$SOPS_AGE_KEY_FILE")" = 600
```

On macOS, use this permission check instead:

```bash
test "$(stat -f '%Lp' "$SOPS_AGE_KEY_FILE")" = 600
```

The age private key must remain on trusted operator machines. It must never be
committed, pasted into a ticket, or printed in CI logs.

## Edit an encrypted Secret

Open the encrypted manifest with SOPS:

```bash
sops apps/arcana/overlays/production/backend-secret.sops.yaml
```

SOPS decrypts the file only for the editor, then re-encrypts it when the file
is saved. The repository should continue to contain values such as:

```yaml
stringData:
  OPENAI_API_KEY: ENC[...]
```

Do not replace the encrypted file with plaintext YAML. If the editor exits
without saving, no change is made.

## Validate the encrypted Secret without printing its value

Check that SOPS still recognizes the file as encrypted:

```bash
sops filestatus \
  apps/arcana/overlays/production/backend-secret.sops.yaml
```

Validate the decrypted Kubernetes object by piping it directly to
`kubeconform`. The plaintext passes through the pipe and is not written to a
new file:

```bash
sops --decrypt \
  apps/arcana/overlays/production/backend-secret.sops.yaml \
  | kubeconform -strict -summary -exit-on-error
```

Check that the encrypted file contains no accidental token-shaped plaintext:

```bash
rg -n 'ENC\[|OPENAI_API_KEY|JWT_SECRET_KEY|DATABASE_URL' \
  apps/arcana/overlays/production/backend-secret.sops.yaml
```

The names are safe to inspect; values must remain encrypted. Avoid commands
such as `sops --decrypt file > decrypted.yaml`, because that leaves a plaintext
copy on disk.

## Edit a non-sensitive ConfigMap

Edit the ConfigMap directly in the deployment repository:

```bash
${EDITOR:-vi} apps/arcana/base/backend-configmap.yaml
```

Validate it before committing:

```bash
kubeconform -strict -summary -exit-on-error \
  apps/arcana/base/backend-configmap.yaml
```

Do not use the ConfigMap for secrets, even if the Kubernetes API displays both
objects in a similar way.

## Review and promote the change

Review only the intended files and check whitespace:

```bash
git diff -- \
  apps/arcana/base/backend-configmap.yaml \
  apps/arcana/overlays/production/backend-secret.sops.yaml

git diff --check
git status --short
```

Commit the specific file, not every file in the working tree:

```bash
git add apps/arcana/overlays/production/backend-secret.sops.yaml
git commit -m "ops: rotate production backend secret"
git push origin main
```

For a ConfigMap-only change, stage the ConfigMap instead:

```bash
git add apps/arcana/base/backend-configmap.yaml
git commit -m "ops: update backend configuration"
git push origin main
```

Confirm the local and remote revisions if needed:

```bash
git rev-parse HEAD
git rev-parse origin/main
```

## Review the Argo CD revision

Refresh the Application after the push:

```bash
export KUBECONFIG="$HOME/.kube/arcana-k3s.yaml"

kubectl annotate application -n argocd arcana-production \
  argocd.argoproj.io/refresh=hard \
  --overwrite

kubectl get application -n argocd arcana-production \
  -o custom-columns='NAME:.metadata.name,SYNC:.status.sync.status,HEALTH:.status.health.status,REVISION:.status.sync.revision'
```

Check the Application revision and conditions:

```bash
kubectl get application -n argocd arcana-production \
  -o jsonpath='revision={.status.sync.revision}{"\\n"}enabled={.spec.syncPolicy.automated.enabled}{"\\n"}operation={.operation}{"\\n"}'

kubectl get application -n argocd arcana-production \
  -o jsonpath='{range .status.conditions[*]}{.type}{": "}{.message}{"\\n"}{end}'
```

Because automated synchronization is intentionally disabled, an `OutOfSync`
status after the push is expected until the reviewed operation is requested.

## Manually sync the reviewed revision

After reviewing the rendered diff in the Argo CD UI, sync from the UI or
request an exact-revision, non-pruning operation with `kubectl`:

```bash
REVISION="$(git rev-parse HEAD)"

kubectl patch application -n argocd arcana-production \
  --type=merge \
  --patch "{\"operation\":{\"initiatedBy\":{\"username\":\"config-rotation-guide\"},\"sync\":{\"revision\":\"$REVISION\",\"prune\":false}}}"
```

Observe the operation:

```bash
kubectl get application -n argocd arcana-production \
  -o jsonpath='{.status.operationState.phase}{"\\n"}'

kubectl get application -n argocd arcana-production \
  -o jsonpath='{.status.operationState.message}{"\\n"}'
```

For a Secret or ConfigMap consumed as environment variables, the affected Pod
usually needs to restart before the process sees the new value. Verify the
rollout:

```bash
kubectl rollout status -n arcana deployment/arcana-backend --timeout=5m
kubectl get pods -n arcana -o wide
kubectl get jobs -n arcana
```

Do not print the Secret value while checking the result. Verify behavior
through a health endpoint or an application-specific smoke test instead:

```bash
kubectl port-forward -n arcana service/arcana-backend 18000:8000
```

```bash
curl --proto '=http' -fsS http://127.0.0.1:18000/api/health/
curl --proto '=http' -fsS http://127.0.0.1:18000/api/health/db
```

## Emergency live edits

Argo CD or `kubectl edit` can change a live ConfigMap or Secret, but this is
not the normal workflow. A live edit creates drift and can be overwritten by
the next Git sync. If an emergency edit is unavoidable:

1. Record exactly what was changed.
2. Make the equivalent change in the deployment repository immediately.
3. Validate and commit the Git version.
4. Reconcile Argo CD back to the Git revision.

Never use the Argo CD UI as a permanent password editor for this setup. SOPS
is the audit trail and encryption boundary.

## Rotation checklist

```text
[ ] Correct repository and production file selected
[ ] Secret edited with SOPS, not a plaintext editor
[ ] SOPS filestatus reports encrypted=true
[ ] Decrypted stream passes kubeconform
[ ] No plaintext secret copy was created
[ ] git diff and git diff --check reviewed
[ ] Specific file committed and pushed
[ ] Argo CD refreshed to the expected revision
[ ] Rendered diff reviewed
[ ] Manual sync requested with prune=false
[ ] Backend rollout completed
[ ] Health/smoke checks passed
[ ] Secret values were never printed
```
