# AWS deployment

Pushes to `master` deploy only after the existing `quality` and `postgres-integration` CI jobs pass. GitHub Actions assumes an AWS IAM role through OIDC, pushes commit-SHA-tagged images (plus convenience `latest` tags) to ECR, and uses Systems Manager Run Command to migrate and restart the EC2 Compose services. Pull requests never deploy.

This repository does not provision AWS infrastructure. Create these ECR repositories first:

- `portfolio/facility-web`
- `portfolio/facility-api`
- `portfolio/facility-migrate`

Configure these GitHub repository variables (not secrets):

- `AWS_REGION`
- `AWS_ROLE_ARN`
- `AWS_INSTANCE_ID`
- `CLOUDFRONT_DOMAIN` (hostname only, without `https://` or a path)

Create GitHub's AWS OIDC identity provider and restrict the deploy role trust policy to this repository's `master` branch subject and the `sts.amazonaws.com` audience. The role needs only ECR authorization/upload access for the three repositories plus permission to send `AWS-RunShellScript` to the deployment instance and read its command invocation. Do not configure long-lived AWS access keys in GitHub.

The EC2 instance must have Docker, Docker Compose, the AWS CLI, and a working SSM agent. Its instance role needs ECR pull access, and SSM must be able to manage the instance. CloudFront must terminate HTTPS and use the EC2 host on port `8081` as its origin. Configure an `/api/*` behavior that allows the application's HTTP methods, disables caching, and forwards cookies, query strings, and the headers needed by the API (including `Origin`). Disable caching for `/health` as well so deployment checks cannot receive a stale response. Redirect viewers to HTTPS. Restrict EC2 port `8081` to the intended CloudFront origin path, for example with the CloudFront origin-facing managed prefix list and an origin-verification control appropriate to the environment. API port `4000`, PostgreSQL port `5432`, and the private RDS instance must not be internet-accessible.

Create `/opt/portfolio/facility/compose.yml` manually from `deploy/compose.aws.example.yml`, replacing only the account and region placeholders. Also create `/opt/portfolio/facility/app.env` with production settings such as `NODE_ENV`, `PORT`, `WEB_ORIGIN`, `DATABASE_URL`, session-cookie settings, and logging level. Set `WEB_ORIGIN` to the exact CloudFront HTTPS origin and require TLS in the RDS connection string. Never commit either file. The workflow creates `/opt/portfolio/facility/deploy.env` with the deployed Git commit SHA and mode `600`.

The migration container runs `prisma migrate deploy` before `api` and `web` are restarted. It never runs the demo seed. The AWS web image calls the same-origin `/api` path; Nginx proxies that path to the internal `api:4000` service.
