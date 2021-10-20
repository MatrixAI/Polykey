#!/usr/bin/env bash

source="${BASH_SOURCE[0]}"
while [ -h "$source" ]; do # resolve $source until the file is no longer a symlink
  script_dir="$(cd -P "$(dirname "$source")" >/dev/null && pwd)"
  source="$(readlink "$source")"
  [[ $source != /* ]] && source="$script_dir/$source" # if $source was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
script_dir="$(cd -P "$(dirname "$source" )" >/dev/null && pwd)"

shopt -qs globstar

exec protoc \
  --proto_path="${script_dir}/../src/proto/schemas" \
  --plugin=protoc-gen-grpc="$(which grpc_node_plugin)" \
  --js_out=import_style=commonjs,binary:src/proto/js \
  --ts_out="grpc_js:${script_dir}/../src/proto/js" \
  --grpc_out="grpc_js:${script_dir}/../src/proto/js" \
  "${script_dir}/../src/proto/schemas/"**/*.proto
