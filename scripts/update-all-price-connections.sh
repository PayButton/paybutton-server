set -e

echo This will affect the database. Are you sure of what you\'re doing? [y/N]
read ans 
if [[ "$ans" = "Y" || "$ans" = "y" ]]; then
  JOBS_ENV=true dotenv -e .env -c -- ts-node -O '{"module":"commonjs"}' -r tsconfig-paths/register ./scripts/updateAllPriceConnections.ts
else 
  echo Exited.
fi
