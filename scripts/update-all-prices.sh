set -e

echo Are you sure you want to update all prices? This will affect the database.[y/N]
read ans 
if [[ $ans = "Y" || $ans = "y" ]]; then
  dotenv -e .env -c -- ts-node -O '{"module":"commonjs"}' -r tsconfig-paths/register ./scripts/updateAllPrices.ts
else 
  echo Exited.
fi
