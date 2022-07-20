#!/usr/bin/env bash

exec docker run -i \
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
    "$PK_TEST_DOCKER_IMAGE" \
    polykey "$@"
