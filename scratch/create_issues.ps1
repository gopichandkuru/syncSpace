$repo = "gopichandkuru/syncSpace"

$epics = @(
    @{title="Epic: Authentication"; label="security,backend,frontend"; assignee="gopichandkuru"},
    @{title="Epic: Dashboard"; label="frontend,ui"; assignee="yashvi-gangani"},
    @{title="Epic: Workspace"; label="frontend,backend"; assignee="malathi1945"},
    @{title="Epic: Room Management"; label="backend,socket"; assignee="kunalkt5656"},
    @{title="Epic: Whiteboard"; label="frontend,feature"; assignee="yashvi-gangani"},
    @{title="Epic: Monaco Editor"; label="frontend,feature"; assignee="gopichandkuru"},
    @{title="Epic: Live Preview"; label="frontend,feature"; assignee="gopichandkuru"},
    @{title="Epic: Socket.IO"; label="socket,backend"; assignee="bhagyasree31"},
    @{title="Epic: CRDT (Yjs)"; label="socket,frontend"; assignee="bhagyasree31"},
    @{title="Epic: Chat"; label="frontend,socket"; assignee="yashvi-gangani"},
    @{title="Epic: Cursor Awareness"; label="socket,frontend"; assignee="bhagyasree31"},
    @{title="Epic: Sticky Notes"; label="frontend,feature"; assignee="yashvi-gangani"},
    @{title="Epic: QR Join"; label="frontend,feature"; assignee="malathi1945"},
    @{title="Epic: Replay"; label="backend,frontend"; assignee="kunalkt5656"},
    @{title="Epic: Presentation Mode"; label="frontend,feature"; assignee="gopichandkuru"},
    @{title="Epic: Activity Feed"; label="frontend,backend"; assignee="malathi1945"},
    @{title="Epic: AI Session Summary"; label="backend,feature"; assignee="gopichandkuru"},
    @{title="Epic: Notifications"; label="socket,backend"; assignee="bhagyasree31"},
    @{title="Epic: MongoDB"; label="database,backend"; assignee="malathi1945"},
    @{title="Epic: Render Deployment"; label="backend,frontend"; assignee="kunalkt5656"},
    @{title="Epic: Testing"; label="testing"; assignee="gopichandkuru"},
    @{title="Epic: Bug Fixes"; label="bug"; assignee="gopichandkuru"},
    @{title="Epic: Documentation"; label="documentation"; assignee="yashvi-gangani"},
    @{title="Epic: Performance"; label="performance"; assignee="bhagyasree31"}
)

foreach ($epic in $epics) {
    $title = $epic.title
    $labels = $epic.label
    $assignee = $epic.assignee

    $body = @"
## Description
This issue serves as the overarching Epic for **$title**. It encompasses all related tasks, bug fixes, and feature implementations required to complete this module.

## Acceptance Criteria
- [ ] Core functionality implemented according to specifications.
- [ ] Code has been peer-reviewed.
- [ ] Automated tests (unit/integration) pass.
- [ ] Performance metrics meet standards.
- [ ] UI/UX matches the design guidelines.

## Checklist
- [ ] Requirements gathering & architecture review
- [ ] Backend / API implementation
- [ ] Frontend UI components integration
- [ ] Manual and automated testing
- [ ] Documentation updated
- [ ] Deployment to staging/production

## Priority
**High**

## Estimated Time
*2-4 Weeks*
"@

    Write-Host "Creating Issue: $title"
    gh issue create --repo $repo --title "$title" --body "$body" --label "$labels" --assignee "$assignee" --milestone "Version 1.0"
}
