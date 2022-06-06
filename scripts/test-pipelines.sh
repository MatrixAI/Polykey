#!/usr/bin/env bash

shopt -s globstar
shopt -s nullglob

# Quote the heredoc to prevent shell expansion
cat << "EOF"
workflow:
  rules:
    # Disable merge request pipelines
    - if: $CI_MERGE_REQUEST_ID
      when: never
    - when: always

default:
  interruptible: true

variables:
  GH_PROJECT_PATH: "MatrixAI/${CI_PROJECT_NAME}"
  GH_PROJECT_URL: "https://${GITHUB_TOKEN}@github.com/${GH_PROJECT_PATH}.git"
  GIT_SUBMODULE_STRATEGY: "recursive"
  # Cache .npm
  NPM_CONFIG_CACHE: "./tmp/npm"
  # Prefer offline node module installation
  NPM_CONFIG_PREFER_OFFLINE: "true"
  # `ts-node` has its own cache
  # It must use an absolute path, otherwise ts-node calls will CWD
  TS_CACHED_TRANSPILE_CACHE: "${CI_PROJECT_DIR}/tmp/ts-node-cache"
  TS_CACHED_TRANSPILE_PORTABLE: "true"

# Cached directories shared between jobs & pipelines per-branch per-runner
cache:
  key: $CI_COMMIT_REF_SLUG
  paths:
    - ./tmp/npm/
    - ./tmp/ts-node-cache/
    # `jest` cache is configured in jest.config.js
    - ./tmp/jest/

image: registry.gitlab.com/matrixai/engineering/maintenance/gitlab-runner
EOF

printf "\n"

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
check:test $test_dir:
  stage: test
  needs: []
  script:
    - >
        nix-shell --run '
        npm run build --verbose;
        npm test -- --ci ${test_files[@]};
        '
  artifacts:
    when: always
    reports:
      junit:
        - ./tmp/junit/junit.xml
EOF
  printf "\n"
done

# All top-level test files are accumulated into 1 job
test_files=(tests/*.test.ts)
cat << EOF
check:test index:
  stage: test
  needs: []
  script:
    - >
        nix-shell --run '
        npm run build --verbose;
        npm test -- --ci ${test_files[@]};
        '
  artifacts:
    when: always
    reports:
      junit:
        - ./tmp/junit/junit.xml
EOF
