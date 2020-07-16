#!/usr/bin/env bash

PROTO_DIR="./proto"
OUT_DIR="./proto/compiled"
PROTOC_GEN_TS_PATH="./node_modules/.bin/protoc-gen-ts"
GRPC_TOOLS_NODE_PROTOC_PLUGIN="./node_modules/.bin/grpc_tools_node_protoc_plugin"
GRPC_TOOLS_NODE_PROTOC="./node_modules/.bin/grpc_tools_node_protoc"

mkdir -p $OUT_DIR

# Generate JS and corresponding TS d.ts codes for each .proto file using the grpc-tools for Node.
$GRPC_TOOLS_NODE_PROTOC \
    --js_out=import_style=commonjs,binary:"$OUT_DIR" \
    --ts_out="$OUT_DIR" \
    --grpc_out=grpc_js:"$OUT_DIR" \
    -I "$PROTO_DIR" \
    "$PROTO_DIR"/*.proto
