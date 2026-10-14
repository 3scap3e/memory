#!/bin/sh
# Set APP_URL and CRON_SECRET in the scheduler's environment. Never embed secrets.
set -eu
: "${APP_URL:?Set the deployed application URL}"
: "${CRON_SECRET:?Set the worker secret}"
# The authorization value is supplied through curl's stdin configuration.
# This avoids putting the secret in command-line arguments.
printf 'header = "Authorization: Bearer %s"\n' "$CRON_SECRET" |
  curl --config - --fail --silent --show-error --request POST \
    "${APP_URL%/}/api/cron/settle"
