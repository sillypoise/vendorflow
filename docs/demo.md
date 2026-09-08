# Try VendorFlow

Open **https://vendorflow-demo.pages.dev/requests**, complete verification, and choose
**Start private demo**. There is no shared login or password.

New workspaces contain the sample set below. If you already have a workspace, choose **Reset my demo**
and confirm to load it. **Reset deletes your current requests and history.** Use a separate browser
or profile instead if you want to preserve your current workspace until it expires.

## What's in the workspace?

These are fictional purchasing scenarios, not actual companies, purchases, or historical decisions.
All amounts are annual USD spend. Websites use reserved `.example` domains.

| Vendor | Annual spend | Starting state | Scenario |
| --- | ---: | --- | --- |
| Beacon Metrics Inc. | $24,000 | Draft | Consolidated operating metrics |
| Harbor Freight Partners | $72,000 | Submitted | Regional warehouse transfers |
| Cedarbridge Advisory | $36,000 | In review | Procurement controls review |
| Northline Support Systems | $18,000 | Changes requested | Support routing; retention details needed |
| Juniper Workplace Services | $42,000 | Approved | Office cleaning and consumables |
| Clearpath Research Studio | $15,000 | Rejected | Research scope already covered by an agreement |

The initial timelines are generated through real workflow transitions when the workspace is created
or reset. They are sample history performed by simulated personas at that time—not backdated work by
real employees. You remain the owner of every sample request.

## A short walkthrough

1. Open **Beacon Metrics Inc.** as **Requester** and submit the draft.
2. Switch **Demo role** to **Administrator**, reopen Beacon Metrics, and assign **Demo visitor**.
3. Switch to **Reviewer**, reopen the request, and approve it—or request changes with a reason.
4. For the correction path, switch back to **Requester**, edit, and resubmit. Assign and review again.
5. Inspect the timeline to see the decisions and their revisions.

For screenshots, the dashboard shows the mixed-state queue. Northline shows an actionable correction
reason, Juniper an approved timeline, and Clearpath a rejection with a business explanation. A reset
returns this same scenario set with fresh request identifiers.

## How isolation works

Supabase creates an anonymous identity stored in your browser session. PostgreSQL creates one
private organization for that identity. Reloading or returning in the same browser reuses it;
`start_demo()` does not create another workspace on every page visit.

A different browser/profile gets a different identity and workspace. Two ordinary tabs usually
share one session, as can multiple private windows in the same browser. A request URL alone never
grants access to someone else's data.

The workspace expires 24 hours after creation. Reset does not extend that deadline. **End session**
clears local access; server data is removed by expiry cleanup, not immediately on sign-out. Clearing
browser storage or losing a private browsing session can also lose access; there is no email/password
recovery for these disposable identities.
