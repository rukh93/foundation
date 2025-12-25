#!/bin/bash
set -e

REDIS_CONFIG="/usr/local/etc/redis/redis.conf"

# Username + password → create ACL
if [ -n "$REDIS_USERNAME" ] && [ -n "$REDIS_PASSWORD" ]; then
  echo "user $REDIS_USERNAME on >$REDIS_PASSWORD ~* +@all" > /tmp/redis_acl.conf
  exec redis-server "$REDIS_CONFIG" --aclfile /tmp/redis_acl.conf
elif [ -n "$REDIS_PASSWORD" ]; then
  exec redis-server "$REDIS_CONFIG" --requirepass "$REDIS_PASSWORD"
else
  exec redis-server "$REDIS_CONFIG"
fi
