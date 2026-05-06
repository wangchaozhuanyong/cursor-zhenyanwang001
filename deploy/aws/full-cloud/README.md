# AWS Full Cloud Migration (EC2 + RDS + Route53 + HTTPS)

This folder contains an execution-ready migration pipeline to move this project fully from local machine to AWS.

## Prerequisites

- A machine with `bash`, `awscli v2`, `jq`, `ssh`, `scp`, `mysqldump`, and `mysql` client.
- AWS credentials configured (`aws configure`) with permissions for EC2, VPC, RDS, Route53, ACM, IAM.
- Existing domain available for Route53 hosted zone delegation.
- Local source database is reachable from this machine.

## Quick Start

1. Copy env template and fill all required values.
2. Run scripts in order from this directory.

```bash
cp .env.example .env
# edit .env

bash 01-create-foundation.sh
bash 02-bootstrap-ec2.sh
bash 03-deploy-app.sh
bash 04-migrate-db.sh
bash 05-route53-https-cutover.sh
bash 06-validate-and-finalize.sh
```

## Outputs

Each script writes state JSON under `.state/`:

- `foundation.json`: VPC/Subnets/SG/EC2/RDS/ElasticIP identifiers
- `ec2-bootstrap.json`: server readiness and SSH probe result
- `deploy.json`: app deployment metadata
- `db-migration.json`: source/target row-count validation summary
- `dns-https.json`: Route53 + cert + nginx HTTPS rollout state
- `final-validation.json`: final health and smoke checks

## Safety Notes

- The scripts are idempotent for repeated runs where possible.
- Database migration script creates a timestamped SQL backup before import.
- Cutover script keeps low DNS TTL and records rollback hints.
- No secret values are committed by these scripts.
