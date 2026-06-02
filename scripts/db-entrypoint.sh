#!/bin/bash

vars="MYSQL_USER MYSQL_PASSWORD MYSQL_ROOT_PASSWORD MYSQL_DATABASE SUPERTOKENS_DB_USER SUPERTOKENS_DB_PASSWORD"
sed_vars () {
    tmpfile=$(mktemp)
    envsubst "$(printf '${%s}' $vars)" < "$1" > "$tmpfile" 
    cat "$tmpfile" > /home/mysql/entrypoint/"$1"
}

cd /home/mysql/raw_entrypoint || exit

for file in *.sql; do
    sed_vars "$file"
done

cd ../entrypoint/ || exit

for file in *.sql; do
    mariadb -u root -p"$MYSQL_ROOT_PASSWORD" < "$file"
done
