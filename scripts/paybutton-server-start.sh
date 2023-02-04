#!/bin/sh

yarn || exit 1
yarn prisma migrate dev || exit 1
yarn prisma db seed || exit 1
sh scripts/init-jobs.sh || exit 1
yarn dev || exit 1
