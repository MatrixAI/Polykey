#!/usr/bin/env bash

# This script will compile type definitions and JavaScript files for each of the proto files contained within <rootDir>/proto
rm -r proto/js
mkdir proto/js

for filepath in proto/*.proto; do
  filename=$(basename "$filepath" .proto)
  # Compiles JavaScript
  pbjs -t static-module -w commonjs --no-beautify --no-convert --no-verify --no-delimited -o proto/js/$filename.js $filepath

  # Compiles type definition files from JavaScript files
  pbts -o proto/js/$filename.d.ts proto/js/$filename.js
done
