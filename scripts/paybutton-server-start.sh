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
# Clear logs

logtime=$(date +%Y-%m-%d@%H:%M)
mv logs/next.log logs/history/next_"$logtime".log
mv logs/jobs.log logs/history/jobs_"$logtime".log
mv logs/ws-server.log logs/history/ws-server_"$logtime".log

if [ "$ENVIRONMENT" = "production" ]; then
    yarn prisma migrate deploy || exit 1
    pm2 start yarn --time --interpreter ash --name jobs --output logs/jobs.log --error logs/jobs.log -- initJobs || exit 1
    pm2 start yarn --time --interpreter ash --name WSServer --output logs/ws-server.log --error logs/ws-server.log -- initWSServer || exit 1
    pm2 start yarn --time --interpreter ash --name next --output logs/next.log --error logs/next.log -- prod || exit 1
else
    yarn prisma migrate dev || exit 1
    yarn prisma db seed || exit 1
    pm2 start yarn --time --interpreter ash --name jobs --output logs/jobs.log --error logs/jobs.log -- initJobs || exit 1
    pm2 start yarn --time --interpreter ash --name WSServer --output logs/ws-server.log --error logs/ws-server.log -- initWSServer || exit 1
    pm2 start yarn --time --interpreter ash --name next --output logs/next.log --error logs/next.log -- dev || exit 1
fi
pm2 logs next
