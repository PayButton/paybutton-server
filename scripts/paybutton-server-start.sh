#!/bin/sh
source .env

yarn || exit 1
yarn prisma migrate dev || exit 1
yarn prisma db seed || exit 1
pm2 start yarn --name jobs -- initJobs || exit 1
pm2 start yarn --name SSEServer -- initSSEServer || exit 1

if [[ "$ENVIRONMENT" == "prod" ]]; then
    pm2 start yarn --name next -- prod || exit 1
else
    pm2 start yarn --name next -- dev || exit 1
fi

tail -f /dev/null
