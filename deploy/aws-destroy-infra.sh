#!/bin/bash
# =============================================================================
# Tear down ALL AWS infrastructure created by aws-create-infra.sh
# Usage: bash deploy/aws-destroy-infra.sh
# =============================================================================

set -euo pipefail

REGION=${AWS_REGION:-us-east-1}
STACK_NAME="openclaw-extension"

echo "===== Destroying OpenClaw Extension Infrastructure ====="
echo "Region: $REGION"
echo ""

# Read deploy info
if [ ! -f deploy-info.json ]; then
  echo "deploy-info.json not found. Cannot destroy."
  exit 1
fi

INSTANCE_ID=$(jq -r '.instanceId' deploy-info.json)
ALLOC_ID=$(jq -r '.allocationId' deploy-info.json)
SG_ID=$(jq -r '.securityGroupId' deploy-info.json)

# Terminate EC2
echo "[1/5] Terminating EC2 instance $INSTANCE_ID..."
aws ec2 terminate-instances --instance-ids "$INSTANCE_ID" --region "$REGION" > /dev/null
aws ec2 wait instance-terminated --instance-ids "$INSTANCE_ID" --region "$REGION"
echo "  Done."

# Release Elastic IP
echo "[2/5] Releasing Elastic IP..."
aws ec2 release-address --allocation-id "$ALLOC_ID" --region "$REGION" 2>/dev/null || echo "  Already released."

# Delete security group
echo "[3/5] Deleting security group..."
aws ec2 delete-security-group --group-id "$SG_ID" --region "$REGION" 2>/dev/null || echo "  Already deleted."

# Delete SSM parameters
echo "[4/5] Deleting SSM parameters..."
aws ssm delete-parameter --name "/${STACK_NAME}/anthropic-api-key" --region "$REGION" 2>/dev/null || true
aws ssm delete-parameter --name "/${STACK_NAME}/extension-token" --region "$REGION" 2>/dev/null || true
aws ssm delete-parameter --name "/${STACK_NAME}/gateway-token" --region "$REGION" 2>/dev/null || true
aws ssm delete-parameter --name "/${STACK_NAME}/domain" --region "$REGION" 2>/dev/null || true
echo "  Done."

# Delete IAM role
echo "[5/5] Deleting IAM role..."
ROLE_NAME="${STACK_NAME}-ec2-role"
PROFILE_NAME="${STACK_NAME}-ec2-profile"
aws iam remove-role-from-instance-profile --instance-profile-name "$PROFILE_NAME" --role-name "$ROLE_NAME" --region "$REGION" 2>/dev/null || true
aws iam delete-instance-profile --instance-profile-name "$PROFILE_NAME" --region "$REGION" 2>/dev/null || true
aws iam delete-role-policy --role-name "$ROLE_NAME" --policy-name "${STACK_NAME}-ssm-read" --region "$REGION" 2>/dev/null || true
aws iam delete-role --role-name "$ROLE_NAME" --region "$REGION" 2>/dev/null || true
echo "  Done."

rm -f deploy-info.json

echo ""
echo "===== All Infrastructure Destroyed ====="
