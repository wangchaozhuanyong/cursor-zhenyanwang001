#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/00-common.sh"

require_cmd aws jq

log "Verifying AWS identity"
"${AWS_CMD[@]}" sts get-caller-identity >/dev/null

if [[ "$EC2_AMI_ID" == "resolve_via_ssm" ]]; then
  log "Resolving Ubuntu 22.04 AMI via SSM"
  EC2_AMI_ID="$("${AWS_CMD[@]}" ssm get-parameter \
    --name /aws/service/canonical/ubuntu/server/22.04/stable/current/arm64/hvm/ebs-gp2/ami-id \
    --query Parameter.Value --output text)"
fi

log "Creating VPC"
VPC_ID="$("${AWS_CMD[@]}" ec2 create-vpc --cidr-block "$VPC_CIDR" \
  --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=$PROJECT_TAG-vpc}]" \
  --query Vpc.VpcId --output text)"
"${AWS_CMD[@]}" ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-support "{\"Value\":true}"
"${AWS_CMD[@]}" ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-hostnames "{\"Value\":true}"

log "Creating subnets"
PUB_A="$("${AWS_CMD[@]}" ec2 create-subnet --vpc-id "$VPC_ID" --availability-zone "$AZ_A" \
  --cidr-block "$PUBLIC_SUBNET_A_CIDR" --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT_TAG-public-a}]" \
  --query Subnet.SubnetId --output text)"
PUB_B="$("${AWS_CMD[@]}" ec2 create-subnet --vpc-id "$VPC_ID" --availability-zone "$AZ_B" \
  --cidr-block "$PUBLIC_SUBNET_B_CIDR" --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT_TAG-public-b}]" \
  --query Subnet.SubnetId --output text)"
PRI_A="$("${AWS_CMD[@]}" ec2 create-subnet --vpc-id "$VPC_ID" --availability-zone "$AZ_A" \
  --cidr-block "$PRIVATE_SUBNET_A_CIDR" --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT_TAG-private-a}]" \
  --query Subnet.SubnetId --output text)"
PRI_B="$("${AWS_CMD[@]}" ec2 create-subnet --vpc-id "$VPC_ID" --availability-zone "$AZ_B" \
  --cidr-block "$PRIVATE_SUBNET_B_CIDR" --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT_TAG-private-b}]" \
  --query Subnet.SubnetId --output text)"

"${AWS_CMD[@]}" ec2 modify-subnet-attribute --subnet-id "$PUB_A" --map-public-ip-on-launch
"${AWS_CMD[@]}" ec2 modify-subnet-attribute --subnet-id "$PUB_B" --map-public-ip-on-launch

log "Creating internet gateway and route table"
IGW_ID="$("${AWS_CMD[@]}" ec2 create-internet-gateway \
  --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=$PROJECT_TAG-igw}]" \
  --query InternetGateway.InternetGatewayId --output text)"
"${AWS_CMD[@]}" ec2 attach-internet-gateway --vpc-id "$VPC_ID" --internet-gateway-id "$IGW_ID"

PUB_RT="$("${AWS_CMD[@]}" ec2 create-route-table --vpc-id "$VPC_ID" \
  --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$PROJECT_TAG-public-rt}]" \
  --query RouteTable.RouteTableId --output text)"
"${AWS_CMD[@]}" ec2 create-route --route-table-id "$PUB_RT" --destination-cidr-block 0.0.0.0/0 --gateway-id "$IGW_ID" >/dev/null
"${AWS_CMD[@]}" ec2 associate-route-table --route-table-id "$PUB_RT" --subnet-id "$PUB_A" >/dev/null
"${AWS_CMD[@]}" ec2 associate-route-table --route-table-id "$PUB_RT" --subnet-id "$PUB_B" >/dev/null

log "Creating security groups"
EC2_SG="$("${AWS_CMD[@]}" ec2 create-security-group --group-name "$PROJECT_TAG-ec2-sg" \
  --description "EC2 SG for $PROJECT_TAG" --vpc-id "$VPC_ID" --query GroupId --output text)"
RDS_SG="$("${AWS_CMD[@]}" ec2 create-security-group --group-name "$PROJECT_TAG-rds-sg" \
  --description "RDS SG for $PROJECT_TAG" --vpc-id "$VPC_ID" --query GroupId --output text)"

"${AWS_CMD[@]}" ec2 authorize-security-group-ingress --group-id "$EC2_SG" --ip-permissions \
"[
  {\"IpProtocol\":\"tcp\",\"FromPort\":22,\"ToPort\":22,\"IpRanges\":[{\"CidrIp\":\"$SSH_ALLOW_CIDR\",\"Description\":\"SSH\"}]},
  {\"IpProtocol\":\"tcp\",\"FromPort\":80,\"ToPort\":80,\"IpRanges\":[{\"CidrIp\":\"0.0.0.0/0\",\"Description\":\"HTTP\"}]},
  {\"IpProtocol\":\"tcp\",\"FromPort\":443,\"ToPort\":443,\"IpRanges\":[{\"CidrIp\":\"0.0.0.0/0\",\"Description\":\"HTTPS\"}]}
]"
"${AWS_CMD[@]}" ec2 authorize-security-group-ingress --group-id "$RDS_SG" --protocol tcp --port 3306 --source-group "$EC2_SG"

log "Creating DB subnet group"
DB_SUBNET_GROUP="$PROJECT_TAG-db-subnet-group"
"${AWS_CMD[@]}" rds create-db-subnet-group \
  --db-subnet-group-name "$DB_SUBNET_GROUP" \
  --db-subnet-group-description "DB subnet group for $PROJECT_TAG" \
  --subnet-ids "$PRI_A" "$PRI_B" >/dev/null

log "Creating RDS instance (this can take 10-20 minutes)"
RDS_ID="$PROJECT_TAG-rds"
"${AWS_CMD[@]}" rds create-db-instance \
  --db-instance-identifier "$RDS_ID" \
  --engine mysql \
  --engine-version "$RDS_ENGINE_VERSION" \
  --db-instance-class "$RDS_INSTANCE_CLASS" \
  --allocated-storage "$RDS_ALLOCATED_STORAGE" \
  --master-username "$RDS_MASTER_USERNAME" \
  --master-user-password "$RDS_MASTER_PASSWORD" \
  --vpc-security-group-ids "$RDS_SG" \
  --db-subnet-group-name "$DB_SUBNET_GROUP" \
  --db-name "$RDS_DB_NAME" \
  --backup-retention-period 7 \
  --no-publicly-accessible \
  --storage-type gp3 >/dev/null
"${AWS_CMD[@]}" rds wait db-instance-available --db-instance-identifier "$RDS_ID"
RDS_ENDPOINT="$("${AWS_CMD[@]}" rds describe-db-instances --db-instance-identifier "$RDS_ID" \
  --query "DBInstances[0].Endpoint.Address" --output text)"

log "Creating EC2 instance"
INSTANCE_ID="$("${AWS_CMD[@]}" ec2 run-instances \
  --image-id "$EC2_AMI_ID" \
  --instance-type "$EC2_INSTANCE_TYPE" \
  --key-name "$EC2_KEY_NAME" \
  --security-group-ids "$EC2_SG" \
  --subnet-id "$PUB_A" \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$PROJECT_TAG-app-ec2}]" \
  --query "Instances[0].InstanceId" --output text)"
"${AWS_CMD[@]}" ec2 wait instance-running --instance-ids "$INSTANCE_ID"

log "Allocating and associating Elastic IP"
ALLOC_ID="$("${AWS_CMD[@]}" ec2 allocate-address --domain vpc --query AllocationId --output text)"
PUBLIC_IP="$("${AWS_CMD[@]}" ec2 describe-addresses --allocation-ids "$ALLOC_ID" --query "Addresses[0].PublicIp" --output text)"
"${AWS_CMD[@]}" ec2 associate-address --instance-id "$INSTANCE_ID" --allocation-id "$ALLOC_ID" >/dev/null

FOUNDATION_JSON="$(jq -n \
  --arg region "$AWS_REGION" \
  --arg vpcId "$VPC_ID" \
  --arg pubA "$PUB_A" \
  --arg pubB "$PUB_B" \
  --arg priA "$PRI_A" \
  --arg priB "$PRI_B" \
  --arg ec2Sg "$EC2_SG" \
  --arg rdsSg "$RDS_SG" \
  --arg dbSubnetGroup "$DB_SUBNET_GROUP" \
  --arg rdsId "$RDS_ID" \
  --arg rdsEndpoint "$RDS_ENDPOINT" \
  --arg instanceId "$INSTANCE_ID" \
  --arg elasticIp "$PUBLIC_IP" \
  --arg allocationId "$ALLOC_ID" \
  '{region:$region,vpcId:$vpcId,publicSubnetA:$pubA,publicSubnetB:$pubB,privateSubnetA:$priA,privateSubnetB:$priB,ec2SecurityGroup:$ec2Sg,rdsSecurityGroup:$rdsSg,dbSubnetGroup:$dbSubnetGroup,rdsInstanceId:$rdsId,rdsEndpoint:$rdsEndpoint,ec2InstanceId:$instanceId,elasticIp:$elasticIp,elasticAllocationId:$allocationId}')"
write_state foundation.json "$FOUNDATION_JSON"

log "Foundation complete"
log "State written: $STATE_DIR/foundation.json"
