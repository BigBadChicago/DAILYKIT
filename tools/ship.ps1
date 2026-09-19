# Ships a patch delivered from a Claude conversation: creates a branch from the
# patch's base commit, applies and commits it with the message the patch
# carries, pushes the branch to origin, and prints the pull request link.
#
# Usage, from the repository root, in Windows PowerShell or pwsh:
#   powershell -ExecutionPolicy Bypass -File tools\ship.ps1 path\to\letter-trail.patch
#
# The branch is claude/<patch file name>. The base commit comes from the
# "base-commit:" line that git format-patch --base writes, so the patch always
# applies to the tree it was built and tested on, however far main has moved.
# Anything newer on main meets it in the pull request, where it can be seen.
# Nothing is pushed unless every step before the push succeeded.

param(
  [Parameter(Mandatory = $true)][string]$Patch,
  [string]$Remote = "origin"
)

function Stop-Ship([string]$Message) {
  Write-Host "ship: $Message" -ForegroundColor Red
  exit 1
}

function Confirm-Git([string]$Message) {
  if ($LASTEXITCODE -ne 0) { Stop-Ship $Message }
}

# Resolved before any branch switch, because a relative path must survive it.
if (-not (Test-Path -LiteralPath $Patch -PathType Leaf)) { Stop-Ship "no patch file at $Patch" }
$patchPath = (Resolve-Path -LiteralPath $Patch).Path

$root = git rev-parse --show-toplevel 2>$null
Confirm-Git "not inside a git repository"
$gitDir = git rev-parse --git-dir
if ((Test-Path (Join-Path $gitDir "rebase-apply")) -or (Test-Path (Join-Path $gitDir "rebase-merge"))) {
  Stop-Ship "an earlier git am or rebase is unfinished; run git am --abort first"
}
if (git status --porcelain) { Stop-Ship "the working tree has uncommitted changes; commit or stash them first" }

$match = Select-String -LiteralPath $patchPath -Pattern '^base-commit: ([0-9a-f]{40})\s*$' | Select-Object -First 1
if (-not $match) { Stop-Ship "the patch names no base commit; it must be made with git format-patch --base" }
$base = $match.Matches[0].Groups[1].Value

$name = [IO.Path]::GetFileNameWithoutExtension($patchPath).ToLowerInvariant()
if ($name -notmatch '^[a-z0-9]+(-[a-z0-9]+)*$') { Stop-Ship "the patch file name must be lowercase words joined by hyphens, got $name" }
$branch = "claude/$name"

git show-ref --verify --quiet "refs/heads/$branch"
if ($LASTEXITCODE -eq 0) { Stop-Ship "branch $branch already exists locally; delete it or rename the patch" }

git fetch $Remote
Confirm-Git "could not fetch $Remote"
git cat-file -e "$base^{commit}" 2>$null
Confirm-Git "base commit $base is not in this repository even after fetching"

$start = git rev-parse --abbrev-ref HEAD

# Steps 1 to 4: branch from the base, then git am stages and commits in one step.
git switch -c $branch $base
Confirm-Git "could not create $branch from $base"
git am --3way $patchPath
if ($LASTEXITCODE -ne 0) {
  git am --abort
  git switch $start
  git branch -D $branch
  Stop-Ship "the patch did not apply; nothing was committed or pushed, and you are back on $start"
}

# Step 5.
git push -u $Remote $branch
Confirm-Git "the push failed; $branch is committed locally and can be pushed again with: git push -u $Remote $branch"

# Step 6.
$url = (git remote get-url $Remote) -replace '\.git$', '' -replace '^git@github\.com:', 'https://github.com/'
$subject = git log -1 --format=%s
Write-Host ""
Write-Host "ship: pushed $branch" -ForegroundColor Green
Write-Host "ship: commit    $subject"
Write-Host "ship: based on  $base"
Write-Host "ship: a pull request can be created at $url/compare/main...$branch" -ForegroundColor Green
Write-Host "ship: you are on $branch; git switch $start returns you."
