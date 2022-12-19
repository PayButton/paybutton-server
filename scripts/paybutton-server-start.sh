#!/bin/sh
set -e

yarn
yarn prisma migrate dev
yarn prisma db seed
tmux new-session -d -s "initJobs" 'yarn initJobs | tee jobs/out.log'
yarn dev
