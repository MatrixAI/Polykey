#!/usr/bin/env bash

set -o errexit   # abort on nonzero exitstatus
set -o nounset   # abort on unbound variable
set -o pipefail  # don't hide errors within pipes

shopt -s globstar
shopt -s nullglob

# Quote the heredoc to prevent shell expansion
cat << "EOF"
variables:
  GIT_SUBMODULE_STRATEGY: "recursive"
  GH_PROJECT_PATH: "MatrixAI/${CI_PROJECT_NAME}"
  GH_PROJECT_URL: "https://${GITHUB_TOKEN}@github.com/${GH_PROJECT_PATH}.git"
  # Cache .npm
  npm_config_cache: "${CI_PROJECT_DIR}/tmp/npm"
  # Prefer offline node module installation
  npm_config_prefer_offline: "true"

default:
  image: registry.gitlab.com/matrixai/engineering/maintenance/gitlab-runner
  interruptible: true
  before_script:
    # Replace this in windows runners that use powershell
    # with `mkdir -Force "$CI_PROJECT_DIR/tmp"`
    - mkdir -p "$CI_PROJECT_DIR/tmp"

# Cached directories shared between jobs & pipelines per-branch per-runner
cache:
  key: $CI_COMMIT_REF_SLUG
  # Preserve cache even if job fails
  when: 'always'
  paths:
    - ./tmp/npm/
    # Homebrew cache is only used by the macos runner
    - ./tmp/Homebrew
    # Chocolatey cache is only used by the windows runner
    - ./tmp/chocolatey/
    # `jest` cache is configured in jest.config.js
    - ./tmp/jest/

stages:
  - check       # Linting, unit tests
EOF

printf "\n"

# Each test directory has its own job
for test_dir in tests/**/*/; do
  # Ignore discovery domain for now
  if [[ "$test_dir" =~ discovery ]]; then
    continue
  fi
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
  stage: check
  needs: []
  script:
    - >
      nix-shell --arg ci true --run $'
      npm test -- --ci --coverage ${test_files[@]};
      '
  artifacts:
    when: always
    reports:
      junit:
        - ./tmp/junit/junit.xml
      coverage_report:
        coverage_format: cobertura
        path: ./tmp/coverage/cobertura-coverage.xml
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
EOF
  printf "\n"
done

# All top-level test files are accumulated into 1 job
test_files=(tests/*.test.ts)
cat << EOF
check:test index:
  stage: check
  needs: []
  script:
    - >
      nix-shell --arg ci true --run $'
      npm test -- --ci --coverage ${test_files[@]};
      '
  artifacts:
    when: always
    reports:
      junit:
        - ./tmp/junit/junit.xml
      coverage_report:
        coverage_format: cobertura
        path: ./tmp/coverage/cobertura-coverage.xml
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
EOF
