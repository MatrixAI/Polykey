#!/usr/bin/env bash

# This script relies on a smallstep CA running on $STEP_CA_URL with fingerprint $CERTIFICATE_AUTHORITY_FINGERPRINT
# Make sure the root_ca.crt is in the tmp/secrets/CA folder

export PEER_1_PATH=$(pwd)/tmp/secrets/peer1
export PEER_2_PATH=$(pwd)/tmp/secrets/peer2

mkdir $PEER_1_PATH
mkdir $PEER_2_PATH

step ca certificate localhost $PEER_1_PATH/server.crt $PEER_1_PATH/server.key
step ca certificate localhost $PEER_2_PATH/server.crt $PEER_2_PATH/server.key
