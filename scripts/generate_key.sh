#!/usr/bin/env bash

export CA_PATH=tmp/secrets/CA
export PEER_1_PATH=tmp/secrets/peer1
export PEER_2_PATH=tmp/secrets/peer2

mkdir $CA_PATH
mkdir $PEER_1_PATH
mkdir $PEER_2_PATH

step ca root --fingerprint $CERTIFICATE_AUTHORITY_FINGERPRINT $CA_PATH/root_ca.crt
step ca certificate localhost $PEER_1_PATH/server.crt $PEER_1_PATH/server.key
step ca certificate localhost $PEER_2_PATH/server.crt $PEER_2_PATH/server.key
