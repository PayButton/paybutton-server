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

start_processes() {
  pm2 start yarn --time --name jobs --output logs/jobs.log --error logs/jobs.log -- initJobs
  pm2 start yarn --time --name WSServer --output logs/ws-server.log --error logs/ws-server.log -- initWSServer
  pm2 start yarn --time --name next --output logs/next.log --error logs/next.log -- "$1"
}

logtime=$(date +%Y-%m-%d@%H:%M)
[ -e logs/next.log ] && mv logs/next.log logs/history/next_"$logtime".log
[ -e logs/jobs.log ] && mv logs/jobs.log logs/history/jobs_"$logtime".log
[ -e logs/ws-server.log ] && mv logs/ws-server.log logs/history/ws-server_"$logtime".log

if [ "$ENVIRONMENT" = "production" ]; then
    yarn prisma migrate deploy || exit 1
    yarn prisma generate || exit 1
    start_processes prod
else
    yarn prisma migrate dev || exit 1
    yarn prisma db seed || exit 1
    start_processes dev
fi
pm2 logs next

