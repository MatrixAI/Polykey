#!/usr/bin/env bash

# All directories are accumulated

for test in tests/*/; do
test="${test%\/}"
cat << EOF
test ${test##*/}:
  image: registry.gitlab.com/matrixai/engineering/maintenance/gitlab-runner
  stage: test
  interruptible: true
  script:
    - >
        nix-shell -I nixpkgs=./pkgs.nix --packages nodejs --run '
        npm install;
        npm test -- ./$test;
        '
EOF
done

# All tests in the tests index are accumulated

tests=(tests/*.test.ts)
cat << EOF
test index:
  image: registry.gitlab.com/matrixai/engineering/maintenance/gitlab-runner
  stage: test
  interruptible: true
  script:
    - >
        nix-shell -I nixpkgs=./pkgs.nix --packages nodejs --run '
        npm install;
        npm test -- ./${tests[@]};
        '
EOF
