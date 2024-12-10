#!/bin/sh
. .env
. .env.local

echo Waiting for db...                                              
while true; do                                                      
  nc -z -p "$MAIN_DB_PORT" "$MAIN_DB_HOST" "$MAIN_DB_PORT" && break                             
  sleep 1
done                                                                
echo Connected to the db.

yarn || exit 1
rm logs/*
if [ "$ENVIRONMENT" = "production" ]; then
    export DEBUG="prisma*"
    yarn prisma migrate deploy || exit 1
    pm2 start yarn --time --interpreter ash --name jobs -- initJobs || exit 1
    pm2 start yarn --time --interpreter ash --name WSServer -- initWSServer || exit 1
    pm2 start yarn --time --interpreter ash --name next -- prod || exit 1
else
    yarn prisma migrate dev || exit 1
    yarn prisma db seed || exit 1
    pm2 start yarn --time --interpreter ash --name jobs -- initJobs || exit 1
    pm2 start yarn --time --interpreter ash --name WSServer -- initWSServer || exit 1
    pm2 start yarn --time --interpreter ash --name next -- dev || exit 1
fi
pm2 logs next
