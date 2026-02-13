## Merging bugfix branch to main

### Related issue
Closes \<_insert link to issue that will be closed by this ticket_\>

### Bugfix release notes
_Describe what this code does in a **non technical way**._

### How can the code be tested?
_Describe how the code can be tested._

### Checklist for reviewers
- [ ] Jira issue is linked in [Related issue](#related-issue)
- [ ] [Bugfix release notes](#bugfix-release-notes) has been filled out.
- [ ] [README.md](README.md) has been updated with necessary information for the code change.
- [ ] Code has been reviewed.
- [ ] Code has been tested, if not checked please state why.

### Checklist for Developer
- [ ] Merge bugfix branch to main (delete source branch, squash commits).
- [ ] Merge main into dev branch (will transfer the bugfix to dev branch)
- [ ] Create a [tagged release](https://docs.gitlab.com/ee/user/project/releases/#create-a-release) with the above summarised release notes and push to the registry.
