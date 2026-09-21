#!/usr/bin/env bash
# The full container gate, one step per line in a log, run detached so no single
# tool call meets the 300 second cutoff (HANDOFF section 2).
#
#   setsid nohup bash tools/gate.sh > /tmp/gate.log 2>&1 &
#   grep -E 'PASS|FAIL|DONE' /tmp/gate.log
#
# Every package script ending in :verify is found and run on its own, so a new
# game's verifier joins the gate by existing. Full output of each step goes to
# /tmp/gate.<step>.log; the summary line carries the step's last useful line.
set -u
cd "$(dirname "$0")/.."
status=0
step() {
  local name="$1"; shift
  local log="/tmp/gate.${name//[:\/]/-}.log"
  local started=$SECONDS
  if "$@" > "$log" 2>&1; then
    printf 'PASS %-28s %4ss  %s\n' "$name" "$((SECONDS - started))" "$(summary "$name" "$log")"
  else
    status=1
    printf 'FAIL %-28s %4ss  %s\n' "$name" "$((SECONDS - started))" "$(tail -n 3 "$log" | tr '\n' ' ')"
  fi
}
summary() {
  # Vitest prints its totals as "Test Files" and "Tests" lines; everything else
  # ends on its own summary line.
  if [ "$1" = "tests" ]; then
    grep -E '^ *(Test Files|Tests) ' "$2" | sed 's/\x1b\[[0-9;]*m//g' | tr -s ' ' | tr '\n' ';'
  else
    grep -v '^\s*$' "$2" | tail -n 1 | sed 's/\x1b\[[0-9;]*m//g' | cut -c1-140
  fi
}
step typecheck npm run -s typecheck
step typecheck:tools npm run -s typecheck:tools
step typecheck:sw npm run -s typecheck:sw
step depcheck npm run -s depcheck
step tests npx vitest run
for script in $(node -e 'for (const k of Object.keys(require("./package.json").scripts)) if (k.endsWith(":verify")) console.log(k)'); do
  step "$script" npm run -s "$script"
done
step build npm run -s build
step budget npm run -s budget
step certify npm run -s certify
echo "DONE status $status"
exit $status
