workflow "Build and Publish" {
  on = "push"
  resolves = ["Publish"]
}

action "Build" {
  uses = "actions/npm@master"
  args = "npm install"
}

action "Publish Filter" {
  needs = ["Build"]
  uses = "actions/bin/filter@master"
  args = "branch master"
}

action "Publish" {
  needs = "Publish Filter"
  uses = "mikeal/merge-release@master"
  secrets = ["GITHUB_TOKEN", "NPM_AUTH_TOKEN"]
}
