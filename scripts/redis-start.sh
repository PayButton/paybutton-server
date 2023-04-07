#!/bin/sh

umask 000 || exit 1
redis-server /data/redis/redis.conf --loglevel warning &

# Wait for Redis to start
while ! redis-cli ping > /dev/null 2>&1
do
  sleep 1
done

redis-cli -n 1 FLUSHDB && echo "BullMQ cache flushed." || echo "No redis database of index 1 (BullMQ database) to flush"
wait
