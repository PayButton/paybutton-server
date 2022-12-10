#!/bin/sh
set -e

yarn
yarn prisma migrate dev
yarn prisma db seed
tmux new-session -d -s "initJobs" 'dotenv -e .env.development -- tsx ./jobs/initJobs.ts'
yarn dev
