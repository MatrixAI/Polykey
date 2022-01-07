#!/usr/bin/env bash

# Quote the heredoc to prevent shell expansion
cat << "EOF"
variables:
  GIT_SUBMODULE_STRATEGY: "recursive"
  # Cache .npm
  NPM_CONFIG_CACHE: "./tmp/npm"
  # Prefer offline node module installation
  NPM_CONFIG_PREFER_OFFLINE: "true"
  # `ts-node` has its own cache
  TS_CACHED_TRANSPILE_CACHE: "./tmp/ts-node-cache"

# Cached directories shared between jobs & pipelines per-branch
cache:
  key: $CI_COMMIT_REF_SLUG
  paths:
    - ./tmp/npm/
    - ./tmp/ts-node-cache/
EOF

# SPECIAL CASE
cat << EOF
test binagent:
  image: registry.gitlab.com/matrixai/engineering/maintenance/gitlab-runner
  stage: test
  interruptible: true
  script:
    - >
        nix-shell -I nixpkgs=./pkgs.nix --packages nodejs --run '
        npm ci;
        npm test -- ./tests/bin/agent;
        '
EOF

# # Each top-level test directory has its own job
# for test in tests/*/; do
# test="${test%\/}"
# cat << EOF
# test ${test##*/}:
#   image: registry.gitlab.com/matrixai/engineering/maintenance/gitlab-runner
#   stage: test
#   interruptible: true
#   script:
#     - >
#         nix-shell -I nixpkgs=./pkgs.nix --packages nodejs --run '
#         npm ci;
#         npm test -- ./$test;
#         '
# EOF
# done

# All top-level test files are accumulated into 1 job
# tests=(tests/*.test.ts)
# cat << EOF
# test index:
#   image: registry.gitlab.com/matrixai/engineering/maintenance/gitlab-runner
#   stage: test
#   interruptible: true
#   script:
#     - >
#         nix-shell -I nixpkgs=./pkgs.nix --packages nodejs --run '
#         npm ci;
#         npm test -- ./${tests[@]};
#         '
# EOF
