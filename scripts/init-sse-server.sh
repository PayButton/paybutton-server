#!/bin/sh

date "+start date: %Y-%m-%d %H:%M:%S" > sse-service/out.log
tmux new-session -d -s "sse" "ts-node -O '{\"module\":\"commonjs\"}' sse-service/server.ts 2>&1 | tee -a sse-service/out.log"
