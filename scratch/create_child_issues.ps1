$repo = "gopichandkuru/syncSpace"
$projectId = "6"
$owner = "gopichandkuru"

# Fetch all issues
$issuesJson = gh issue list -R $repo --limit 100 --json number,title,labels,assignees
$issues = $issuesJson | ConvertFrom-Json

foreach ($issue in $issues) {
    if ($issue.title -match "^Epic: (.*)") {
        $epicName = $matches[1]
        $epicNum = $issue.number
        
        Write-Host "Processing Epic: $epicName (#$epicNum)"
        
        # Add Epic to project
        gh project item-add $projectId --owner $owner --url "https://github.com/$repo/issues/$epicNum" | Out-Null
        
        # Create Child Issues
        $childTasks = @(
            @{title="Backend API & Logic for $epicName"; label="backend,enhancement"; role="Backend Engineer"},
            @{title="Frontend UI Components for $epicName"; label="frontend,enhancement"; role="Frontend Engineer"},
            @{title="Integration & Testing for $epicName"; label="testing,enhancement"; role="QA"}
        )

        foreach ($task in $childTasks) {
            $cTitle = $task.title
            $cLabel = $task.label
            $body = @"
## Description
This issue covers the $($task.role) tasks for the $epicName module.
Parent Epic: #$epicNum

## Acceptance Criteria
- [ ] Requirements are fully met for the $epicName module.
- [ ] Code has been peer-reviewed.
- [ ] No regression introduced.

## Checklist
- [ ] Implement core functionality
- [ ] Write unit tests
- [ ] Update documentation

## Priority
High

## Estimated Size
Medium

## Assignee
To be assigned during sprint planning.
"@
            # Create child issue
            Write-Host "  Creating child issue: $cTitle"
            # Attempt to use the epic's assignee if available
            $assigneeParam = ""
            if ($issue.assignees.Count -gt 0) {
                $assigneeParam = "--assignee " + $issue.assignees[0].login
            }
            
            $issueUrl = gh issue create -R $repo --title $cTitle --body $body --label $cLabel $assigneeParam --milestone "Sprint 1"
            
            # Add child to project
            if ($issueUrl) {
                gh project item-add $projectId --owner $owner --url $issueUrl | Out-Null
            }
        }
    }
}
