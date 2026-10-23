# Atlas and Nova: Tavily live search setup

The AI workforce uses Tavily Search API for the `research_search_web` tool. Atlas and Nova can use it to discover current opportunities; the existing public HTTPS page inspector remains a separate tool.

## Add the API key in Render

1. Open the private PRUDEN backend service in Render: https://dashboard.render.com/web/srv-db9t1v3bc2fs73d4hpqg
2. Open **Environment**.
3. Add a variable named `TAVILY_API_KEY`.
4. Paste the key from your Tavily account into the value field and save.
5. Allow Render to apply the environment change when you're ready. Do not add the key to GitHub, `.env.example`, browser code, or any variable prefixed with `VITE_`.

Tavily account: https://app.tavily.com/

## Verification

After the code is merged and the backend has restarted with the key, run a test search through Atlas, such as: `Find current junior developer internships in Kenya posted in the last month. Cite original listing URLs and mark anything not verified on its original page.`

Confirm the result contains real Tavily search results and source URLs. A key being present only changes status to `configured_unverified`; it does not prove the live API works. The workforce status endpoint currently reports `liveSearchTested: false` until a live request is actually verified.

## Cost and limits

Review the current Tavily plan and remaining credits in your Tavily dashboard before testing. The integration uses basic search, requests at most eight results per query, and does not request Tavily-generated answers or raw page content. Search credits and the underlying AI model may have separate limits.

## Safety boundary

Research tools are read-only. They do not log in to job sites, create accounts, submit applications, upload CVs, contact employers, or pay fees. Search results are leads; Atlas should inspect the original listing where possible and clearly label missing deadlines, eligibility, or salary information.
