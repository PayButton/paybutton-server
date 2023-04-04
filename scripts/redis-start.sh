#!/bin/sh

umask 000 || exit 1
redis-cli -n 1 FLUSHDB || echo "No redis database of index 1 (BullMQ database) to flush"
redis-server /data/redis/redis.conf --loglevel warning || exit 1
