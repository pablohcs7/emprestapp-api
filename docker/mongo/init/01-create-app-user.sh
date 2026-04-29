#!/bin/sh
set -eu

mongosh --username "$MONGO_INITDB_ROOT_USERNAME" \
  --password "$MONGO_INITDB_ROOT_PASSWORD" \
  --authenticationDatabase admin <<EOF
use emprestapp_dev
db.createUser({
  user: '$MONGODB_APP_USERNAME',
  pwd: '$MONGODB_APP_PASSWORD',
  roles: [
    {
      role: 'readWrite',
      db: 'emprestapp_dev',
    },
  ],
})
EOF
