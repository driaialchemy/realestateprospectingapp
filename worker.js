import data from "./data.json" with { type: "json" };
import { normalizeLead } from "./scoring.js";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function sortedLeads(env) {
  return data
    .map((lead) => normalizeLead(lead, env))
    .sort((a, b) => b.propensity_score - a.propensity_score);
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: { ...jsonHeaders, ...(init.headers || {}) },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/leads") {
      return jsonResponse(sortedLeads(env));
    }

    const leadMatch = url.pathname.match(/^\/api\/leads\/([^/]+)$/);
    if (leadMatch) {
      const id = decodeURIComponent(leadMatch[1]);
      const lead = sortedLeads(env).find((item) => item.contact_id === id);
      if (!lead) return jsonResponse({ error: "Lead not found" }, { status: 404 });
      return jsonResponse(lead);
    }

    if (url.pathname === "/" || url.pathname === "") {
      return env.ASSETS.fetch(new URL("/landing.html", url));
    }

    if (url.pathname === "/dashboard" || url.pathname === "/dashboard/") {
      return env.ASSETS.fetch(new URL("/index.html", url));
    }

    return env.ASSETS.fetch(request);
  },
};
