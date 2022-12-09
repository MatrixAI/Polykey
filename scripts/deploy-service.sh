#!/usr/bin/env bash

set -o errexit   # abort on nonzero exitstatus
set -o nounset   # abort on unbound variable
set -o pipefail  # don't hide errors within pipes

required_env_vars=(
  AWS_DEFAULT_REGION
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
)

for var in "${required_env_vars[@]}"; do
  if [ -z ${!var+x} ]; then
    printf '%s\n' "Unset $var environment variable" >&2
    exit 1
  fi
done

cluster="$1"

if [ -z "$cluster" ]; then
  printf '%s\n' 'Unset or empty ECS cluster name' >&2
  exit 1
fi

services=$(aws ecs list-services --cluster polykey-testnet --output json | jq -r '.serviceArns[] | capture("(?<service>polykey-testnet-[a-zA-Z0-9]+)$") | .service' )

for service in $services; do
  echo updating service "$service"
  aws ecs update-service \
    --cluster "$cluster" \
    --service "$service" \
    --force-new-deployment \
    --output json \
    --query 'service.{
      serviceName: serviceName,
      serviceArn: serviceArn,
      status: status, deployments: deployments[].{
        id: id,
        status: status,
        rolloutState: rolloutState,
        rolloutStateReason: rolloutStateReason
      }
    }'
done
