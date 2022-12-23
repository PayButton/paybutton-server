#!/bin/sh

yarn || exit
yarn prisma migrate dev || exit
yarn prisma db seed || exit
tmux new-session -d -s "initJobs" 'yarn initJobs | tee jobs/out.log' || exit
yarn dev || exit
