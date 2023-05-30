#!/bin/sh
source .env
source .env.local

yarn || exit 1
yarn prisma migrate dev || exit 1
yarn prisma db seed || exit 1
pm2 start yarn --time --interpreter ash --name jobs -- initJobs || exit 1
pm2 start yarn --time --interpreter ash --name SSEServer -- initSSEServer || exit 1

if [[ "$ENVIRONMENT" == "production" ]]; then
    pm2 start yarn --time --interpreter ash --name next -- build || exit 1
else
    pm2 start yarn --time --interpreter ash --name next -- dev || exit 1
fi

tail -f /dev/null
