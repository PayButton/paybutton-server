#!/bin/sh
# Starts the production Next.js server, running `next build` only when the
# checked-out commit differs from the one the existing build was made from.
# A full build takes over a minute, so rebuilding on every container or pm2
# restart kept the site down far longer than needed. Set FORCE_BUILD=true to
# rebuild anyway (e.g. after editing files on the server without committing).

BUILT_FROM_FILE=.next/BUILT_FROM

# Read the HEAD commit straight from .git: the image has no git binary.
current_rev () {
  ref=$(sed -n 's/^ref: //p' .git/HEAD 2>/dev/null)
  if [ -z "$ref" ]; then
    cat .git/HEAD 2>/dev/null
  elif [ -f ".git/$ref" ]; then
    cat ".git/$ref"
  else
    grep " $ref\$" .git/packed-refs 2>/dev/null | cut -d' ' -f1
  fi
}

rev=$(current_rev)

if [ "$FORCE_BUILD" = "true" ] || [ -z "$rev" ] || [ ! -f .next/BUILD_ID ] || [ "$(cat "$BUILT_FROM_FILE" 2>/dev/null)" != "$rev" ]; then
  echo "Building Next.js app for commit ${rev:-unknown}..."
  next build || exit 1
  [ -n "$rev" ] && echo "$rev" > "$BUILT_FROM_FILE"
else
  echo "Reusing existing Next.js build for commit $rev."
fi

NODE_ENV=production exec next start
