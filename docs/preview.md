# VendorFlow preview

Open **https://vendorflow-demo.pages.dev/requests**, complete verification, and choose
**Start private preview**. There is no shared login or password.

New workspaces contain the sample set below. If you already have a workspace, choose **Reset workspace**
and confirm to load it. **Reset deletes your current requests and history.** Use a separate browser
or profile instead if you want to preserve your current workspace until it expires.

## What's in the workspace?

These are sample purchasing scenarios, not actual companies, purchases, or historical decisions.
There are 18 vendors—three per workflow state—covering all five service categories. Requested annual
spend ranges from $8,400 to $96,000 USD. These amounts are proposed spend, not a booked-spend total.
Websites use reserved `.example` domains. The full set fits the dashboard's first 20-row page.

| Vendor | Annual spend | Starting state | Scenario |
| --- | ---: | --- | --- |
| Beacon Metrics Inc. | $24,000 | Draft | Consolidated operating metrics |
| Harbor Freight Partners | $72,000 | Submitted | Regional warehouse transfers |
| Cedarbridge Advisory | $36,000 | In review | Procurement controls review |
| Northline Support Systems | $18,000 | Changes requested | Support routing; retention details needed |
| Juniper Workplace Services | $42,000 | Approved | Office cleaning and consumables |
| Clearpath Research Studio | $15,000 | Rejected | Research scope already covered by an agreement |
| Alder Fleet Leasing | $96,000 | Draft | Four field-service vehicles and maintenance |
| Redwood Meeting Rooms | $9,600 | Draft | Overflow planning and workshop space |
| Atlas Payroll Services | $54,000 | Submitted | Payroll processing and statutory filings |
| Orchard Learning Library | $8,400 | Submitted | Self-study courses without employee data uploads |
| Bluepeak Identity Cloud | $48,000 | In review | Single sign-on and access reviews |
| Seabrook Packaging Supply | $28,800 | In review | Recyclable packaging and safety stock |
| Willow Records Storage | $14,400 | Changes requested | Records storage; destruction terms needed |
| Ridgeway Delivery Network | $66,000 | Changes requested | Delivery service; coverage terms needed |
| Pinecrest Device Supply | $32,000 | Approved | Replacement laptops and docking stations |
| Lakeshore Accessibility Studio | $22,500 | Approved | Pre-release portal accessibility review |
| Summit Conference Passes | $12,500 | Rejected | Attendance plan and travel budget missing |
| Silverfern Invoice Automation | $19,800 | Rejected | Data residency requirement not met |

The initial timelines are generated through real workflow transitions when the workspace is created
or reset. They are sample history performed by simulated personas at that time—not backdated work by
real employees. You remain the owner of every sample request.

## A short walkthrough

1. Open **Beacon Metrics Inc.** as **Requester** and submit the draft.
2. Switch **Preview role** to **Administrator**, reopen Beacon Metrics, and assign **Preview visitor**.
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
