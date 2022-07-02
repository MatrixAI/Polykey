#!/usr/bin/env bash

# Push container image to $CONTAINER_REPOSITORY
# Pass the path to the container image archive
# For example `deploy-image.sh $(nix-build ./release.nix -A docker`

if [ -z "$CONTAINER_REPOSITORY" ]; then
  printf '%s\n' 'Missing $CONTAINER_REPOSITORY environment variable' >&2
  exit 1
fi

image="$1"

if [ -z "$image" ]; then
  printf '%s\n' 'Missing path to container image archive' >&2
  exit 1
fi

container_tag="$(skopeo list-tags "docker-archive:$image" \
  | jq -r '.Tags[0] | split(":")[1]')";

skopeo --insecure-policy copy \
  "docker-archive:$image" \
  "docker://$CONTAINER_REPOSITORY:$container_tag";

skopeo --insecure-policy copy \
  "docker://$CONTAINER_REPOSITORY:$container_tag" \
  "docker://$CONTAINER_REPOSITORY:latest";
