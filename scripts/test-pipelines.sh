#!/usr/bin/env bash

shopt -s globstar
shopt -s nullglob

# Quote the heredoc to prevent shell expansion
cat << "EOF"
variables:
  GIT_SUBMODULE_STRATEGY: "recursive"
  # Cache .npm
  NPM_CONFIG_CACHE: "./tmp/npm"
  # Prefer offline node module installation
  NPM_CONFIG_PREFER_OFFLINE: "true"
  # `ts-node` has its own cache
  # It must use an absolute path, otherwise ts-node calls will CWD
  TS_CACHED_TRANSPILE_CACHE: "${CI_PROJECT_DIR}/tmp/ts-node-cache"
  TS_CACHED_TRANSPILE_PORTABLE: "true"

# Cached directories shared between jobs & pipelines per-branch
cache:
  key: $CI_COMMIT_REF_SLUG
  paths:
    - ./tmp/npm/
    - ./tmp/ts-node-cache/
    # `jest` cache is configured in jest.config.js
    - ./tmp/jest/
EOF

printf "\n"

# # SPECIAL CASE
# cat << EOF
# test binagent:
#   image: registry.gitlab.com/matrixai/engineering/maintenance/gitlab-runner
#   stage: test
#   interruptible: true
#   script:
#     - >
#         nix-shell -I nixpkgs=./pkgs.nix --packages nodejs --run '
#         npm ci;
#         npm test -- ./tests/bin/agent;
#         '
# EOF

# Each test directory has its own job
for test_dir in tests/**/*/; do
  test_files=("$test_dir"*.test.ts)
  if [ ${#test_files[@]} -eq 0 ]; then
    continue
  fi
  # Remove trailing slash
  test_dir="${test_dir%\/}"
  # Remove `tests/` prefix
  test_dir="${test_dir#*/}"
  cat << EOF
test $test_dir:
  image: registry.gitlab.com/matrixai/engineering/maintenance/gitlab-runner
  stage: test
  interruptible: true
  script:
    - >
        nix-shell -I nixpkgs=./pkgs.nix --packages nodejs --run '
        npm ci;
        npm test -- ${test_files[@]};
        '
EOF
  printf "\n"
done

# All top-level test files are accumulated into 1 job
test_files=(tests/*.test.ts)
cat << EOF
test index:
  image: registry.gitlab.com/matrixai/engineering/maintenance/gitlab-runner
  stage: test
  interruptible: true
  script:
    - >
        nix-shell -I nixpkgs=./pkgs.nix --packages nodejs --run '
        npm ci;
        npm test -- ${test_files[@]};
        '
EOF
