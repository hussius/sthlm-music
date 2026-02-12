## Merging feature branch to dev

### Related issue
Closes [](https://codon-consulting.atlassian.net/browse/)

### Implemented changes 
_Describe what this code does in a **non technical way**. Categorise it as either a fix, update or new feature implementation (remove the subsections that are not used). The text in this section will be part of release notes later._ 

**Fixes**
* _List any bugfixes here. If none, remove._

**Updates**
* _List any updates to existing features here. If none, remove._

**Implements**
* _List any new features implemented here. If none, remove._

### How can the code be tested? 
_Describe how the code can be tested (use unit tests or similar where possible)._

### Checklist for reviewers  
Use local deployment to test changes. 
- [ ] Are there written tests for this feature? 
- [ ] Jira issue is linked in [Related issue](#related-issue)
- [ ] [Implemented changes](#implemented-changes) has been filled out. 
- [ ] [README.md](README.md) has been updated with necessary information for the code change. 
- [ ] Code has been reviewed.
- [ ] Code has been tested, if not checked please state why.
- [ ] Code passes Ci pipeline

### Checklist after merge
- [ ] IF frontend needs functionality, bump version in version.txt and build image and push to the registry with a tag `<version>-dev` (e.g. `v0.3.0-dev`)