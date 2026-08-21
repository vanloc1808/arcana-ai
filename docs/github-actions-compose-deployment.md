# GitHub Actions Compose deployment

Production images are built and pushed to Docker Hub by `.github/workflows/ci.yml`.
After the build succeeds on `main`, the `deploy-compose` job connects to the VPS
over SSH and runs Docker Compose with the commit SHA as `IMAGE_TAG`.

Configure these repository or environment secrets:

- `ARCANA_DEPLOY_SSH_KEY`: private key whose public key is authorized for the VPS
- `ARCANA_VPS_KNOWN_HOSTS`: output for the VPS from `ssh-keyscan`, reviewed before saving
- `ARCANA_VPS_HOST`: VPS hostname or address
- `ARCANA_VPS_USER`: restricted deployment user
- `ARCANA_VPS_PORT`: SSH port; optional, defaults to `22`
- `ARCANA_VPS_APP_DIR`: absolute directory containing `docker-compose.prod.yaml`

The deployment user must be able to run Docker Compose. Prefer Docker's documented
group-based access or a narrowly scoped `sudo` rule rather than storing a root SSH
key in GitHub. The workflow validates the Compose file, pulls the backend, frontend,
worker, and Beat images, then runs `docker compose up -d --remove-orphans`.

The job is serialized so two successful pushes cannot deploy concurrently. The
workflow does not use Argo CD or modify `platform-gitops`; that repository and its
Argo CD Application should be retired after the VPS has been verified on Compose.

To create the host-verification value from a trusted workstation:

```bash
ssh-keyscan -p <ssh-port> <vps-host>
```

Review the fingerprints against an independently trusted server fingerprint before
adding the result to `ARCANA_VPS_KNOWN_HOSTS`.
