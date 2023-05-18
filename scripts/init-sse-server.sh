#!/bin/sh

date "+start date: %Y-%m-%d %H:%M:%S" > sse-service/out.log
tmux new-session -d -s "sse" "yarn initSSEServer 2>&1 | tee -a sse-service/out.log"
