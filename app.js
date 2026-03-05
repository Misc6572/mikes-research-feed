const scriptReact = document.createElement('script');
scriptReact.src = 'https://unpkg.com/preact@10.13.2/dist/preact.umd.js';
document.head.appendChild(scriptReact);

const scriptHTM = document.createElement('script');
scriptHTM.src = 'https://unpkg.com/htm@3.1.1/dist/htm.umd.js';
document.head.appendChild(scriptHTM);

const scriptReactDOM = document.createElement('script');
scriptReactDOM.src = 'https://unpkg.com/preact@10.13.2/hooks/dist/hooks.umd.js';
document.head.appendChild(scriptReactDOM);

scriptReactDOM.onload = () => {
  const { h, render } = preact;
  const { useState, useEffect, useMemo } = preactHooks;
  const html = htm.bind(h);

  const FEEDS = [
    // --- VERIFIED WORKING FEEDS ---
    { id: "Pew", title: "Pew Research", url: "https://www.pewresearch.org" },
    { id: "StLouisFed", title: "St. Louis Fed", url: "https://fredblog.stlouisfed.org" },
    { id: "CFR", title: "Council on Foreign Relations", url: "https://www.cfr.org" },
    { id: "CEPR", title: "CEPR (Economic Policy)", url: "https://cepr.net" },
    { id: "Atlantic", title: "Atlantic Council", url: "https://www.atlanticcouncil.org" },
    { id: "CSIS", title: "CSIS (Security/Military)", url: "https://www.csis.org/rss.xml" }
  ];

  const PROXY = "https://api.rss2json.com/v1/api.json?rss_url=";

  async function fetchFeed(url) {
    try {
      const res = await fetch(PROXY + encodeURIComponent(url));
      if (!res.ok) throw new Error("Network error");
      const data = await res.json();
      if (data.status !== "ok") throw new Error("RSS parse error");
      return data.items.map(item => ({
        title: item.title || "No title",
        link: item.link || "#",
        pubDate: item.pubDate || "",
        description: item.description || "",
      }));
    } catch (e) {
      console.warn(`Skipping feed at ${url} due to error: ${e.message}`);
      return [];
    }
  }

  // Header component: Title + Search/Filter
  function HeaderBar({ searchTerm, setSearchTerm, filterSource, setFilterSource, sources }) {
    return html`
      <header role="banner" class="w-full bg-gray-50 py-10 border-b border-gray-300">
        <div
          class="max-w-5xl mx-auto px-4"
          style="border: 2px dashed #60A5FA; /* DEBUG: blue dashed container */"
        >
          <h1
            class="text-5xl font-extrabold uppercase tracking-widest mb-6 text-center"
            style="border: 2px dotted #2563EB; /* DEBUG: blue dotted title */"
          >
            MIKE'S AMAZING NEWS FEED
          </h1>

          <form
            class="flex flex-col sm:flex-row justify-center items-center gap-6 max-w-xl mx-auto"
            style="border: 2px dotted #F59E0B; /* DEBUG: amber dotted form */"
            onSubmit=${e => e.preventDefault()}
            aria-label="Search and filter articles"
          >
            <input
              class="w-full sm:w-72 p-3 rounded border border-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="search"
              placeholder="Search titles or descriptions"
              value=${searchTerm}
              onInput=${e => setSearchTerm(e.target.value)}
              aria-label="Search articles"
            />
            <select
              class="w-full sm:w-48 p-3 rounded border border-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value=${filterSource}
              onChange=${e => setFilterSource(e.target.value)}
              aria-label="Filter by source"
            >
              <option value="ALL">All Sources</option>
              ${sources.map(src => html`<option value=${src}>${src}</option>`)}
            </select>
          </form>
        </div>
      </header>
    `;
  }

  function FeedResults({ items, loading }) {
    return html`
      <main role="main" class="max-w-5xl mx-auto px-4 py-8">
        ${loading && html`<p class="text-center text-lg font-semibold italic">Scanning for new intelligence...</p>`}

        <section id="listResults" class="flex flex-col">
          ${items.map(item => html`
            <div key=${item.link} class="group">
              <article class="py-12 px-2">
                <!-- Source Tag -->
                <div class="mb-3">
                  <span class="bg-black text-white text-xs font-black px-3 py-1 uppercase tracking-tighter">
                    ${item.source}
                  </span>
                </div>

                <!-- Title -->
                <a href=${item.link} target="_blank" class="text-3xl font-bold text-black hover:text-blue-800 transition-colors block leading-tight">
                  ${item.title}
                </a>

                <!-- Meta & Description -->
                <p class="mt-2 text-sm font-medium text-gray-500 uppercase tracking-widest">${item.pubDateDate.toLocaleDateString()}</p>
                <div class="mt-6 text-gray-800 text-lg leading-relaxed max-w-3xl" dangerouslySetInnerHTML=${{ __html: item.description }}></div>
              </article>
              
              <!-- THE BLACK BAR -->
              <div class="h-1 bg-black w-full my-4"></div>
            </div>
          `)}
        </section>
      </main>
    `;
  }

  
  function App() {
    const [feedItems, setFeedItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterSource, setFilterSource] = useState("ALL");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
      setLoading(true);
      (async () => {
        let all = [];
        for (const feed of FEEDS) {
          const items = await fetchFeed(feed.url);
          const annotated = items.map(i => ({
            ...i,
            source: feed.title,
            pubDateDate: new Date(i.pubDate),
          }));
          all.push(...annotated);
        }
        all.sort((a, b) => b.pubDateDate - a.pubDateDate);
        setFeedItems(all);
        setLoading(false);
      })();
    }, []);

    const filteredItems = useMemo(() => {
      return feedItems.filter(item => {
        const matchesSource = filterSource === "ALL" || item.source === filterSource;
        const matchesSearch =
          searchTerm === "" ||
          (item.title + item.description).toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSource && matchesSearch;
      });
    }, [feedItems, filterSource, searchTerm]);

    // Extract all unique sources for the filter dropdown
    const sources = useMemo(() => {
      const setSources = new Set(feedItems.map(i => i.source));
      return Array.from(setSources).sort();
    }, [feedItems]);

    return html`
      <div class="min-h-screen bg-gray-100">
        <${HeaderBar}
          searchTerm=${searchTerm}
          setSearchTerm=${setSearchTerm}
          filterSource=${filterSource}
          setFilterSource=${setFilterSource}
          sources=${sources}
        />
        <${FeedResults} items=${filteredItems} loading=${loading} />
      </div>
    `;
  }

  render(html`<${App} />`, document.getElementById("root"));
};
