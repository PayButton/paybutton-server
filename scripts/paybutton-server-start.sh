#!/bin/sh

yarn || exit
yarn prisma migrate dev || exit
yarn prisma db seed || exit
./init-jobs.sh || exit
yarn dev || exit
