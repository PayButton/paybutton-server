#!/bin/sh

yarn || exit
yarn prisma migrate dev || exit
yarn prisma db seed || exit
date "+start date: %Y-%m-%d %H:%M:%S" > jobs/out.log || exit
tmux new-session -d -s "initJobs" 'yarn initJobs 2>&1 | tee -a jobs/out.log' || exit
yarn dev || exit
