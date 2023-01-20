#!/bin/sh

yarn || exit 1
yarn prisma migrate dev || exit 1
yarn prisma db seed || exit 1
date "+start date: %Y-%m-%d %H:%M:%S" > jobs/out.log || exit 1
tmux new-session -d -s "initJobs" 'yarn initJobs 2>&1 | tee -a jobs/out.log' || exit 1
yarn dev || exit 1
