# Run this from C:\AA_Whetstone\whetstone-portal
# Creates a new branch so master stays untouched

# 1. Make sure we're on master and up to date
git checkout master
git pull origin master

# 2. Create the dark-mode branch
git checkout -b dark-mode-redesign

# 3. Apply the patch (with --3way for better conflict handling)
git apply --3way dark-mode-v2.patch

# 4. If the apply fails, try with whitespace ignore:
# git apply --3way --ignore-whitespace dark-mode-v2.patch

# 5. Commit
git add .
git commit -m "dark mode redesign - Notion Dark x execution-system aesthetic"

# 6. Push the branch
git push origin dark-mode-redesign

# Now go to GitHub and create a PR from dark-mode-redesign -> master
# You can review every change before merging

# TO REVERT (if anything goes wrong):
# git checkout master
# git branch -D dark-mode-redesign
