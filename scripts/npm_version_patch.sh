if [ -n "$(git status --porcelain)" ]; then
  echo "There are changes yet to be committed, cannot continue";
else
  echo "No uncommitted changes, continuing..."
  VERSION=$(npm --no-commit-hooks --no-git-tag-version version patch)
  nix-shell --command "exit"
  git commit -a -m "$VERSION"
  COMMIT=$(git rev-parse HEAD)
  git tag $VERSION $COMMIT
fi
