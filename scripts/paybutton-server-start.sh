#!/bin/sh

yarn || exit
yarn prisma migrate dev || exit
yarn prisma db seed || exit
tmux new-session -d -s "initJobs" 'yarn initJobs' || exit
yarn dev || exit
