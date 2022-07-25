#!/usr/bin/env bash

exec docker run \
    --interactive \
    --rm \
    --network host \
    --pid host \
    --userns host \
    --user "$(id -u)" \
    --mount type=bind,src="$PK_TEST_DATA_PATH",dst="$PK_TEST_DATA_PATH" \
    --env PK_PASSWORD \
    --env PK_NODE_PATH \
    --env PK_RECOVERY_CODE \
    --env PK_TOKEN \
    --env PK_ROOT_KEY \
    --env PK_NODE_ID \
    --env PK_CLIENT_HOST \
    --env PK_CLIENT_PORT \
    "$PK_TEST_DOCKER_IMAGE" \
    polykey "$@"
