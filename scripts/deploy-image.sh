#!/usr/bin/env bash

set -o errexit   # abort on nonzero exitstatus
set -o nounset   # abort on unbound variable
set -o pipefail  # don't hide errors within pipes

image="$1"
tag="$2"
registry_image="$3"

if [ -z "$image" ]; then
  printf '%s\n' 'Unset or empty path to container image archive' >&2
  exit 1
fi

if [ -z "$tag" ]; then
  printf '%s\n' 'Unset or empty custom tag for target registry' >&2
  exit 1
fi

if [ -z "$registry_image" ]; then
  printf '%s\n' 'Unset or empty image registry path' >&2
  exit 1
fi

default_tag="$(skopeo --tmpdir "${TMPDIR-/tmp}" list-tags "docker-archive:$image" \
  | jq -r '.Tags[0] | split(":")[1]')"

skopeo \
  --insecure-policy \
  --tmpdir "${TMPDIR-/tmp}" \
  copy \
  "docker-archive:$image" \
  "docker://$registry_image:$default_tag"

# Cannot use `--additional-tag` for ECR
# each tag must be additionally set

skopeo \
  --insecure-policy \
  --tmpdir "${TMPDIR-/tmp}" \
  copy \
  "docker://$registry_image:$default_tag" \
  "docker://$registry_image:$tag" &

skopeo \
  --insecure-policy \
  --tmpdir "${TMPDIR-/tmp}" \
  copy \
  "docker://$registry_image:$default_tag" \
  "docker://$registry_image:latest" &

wait
