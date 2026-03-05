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
    { id: "NBER", title: "NBER", url: "https://www.nber.org/system/files/working_papers/wip.xml" },
    { id: "RAND", title: "RAND", url: "https://www.rand.org/pubs.rss" },
    { id: "Pew", title: "Pew Research", url: "https://www.pewresearch.org/feed/" },
    { id: "Brookings", title: "Brookings", url: "https://www.brookings.edu/feed/" },
    { id: "Urban", title: "Urban Institute", url: "https://www.urban.org/rss.xml" },
    { id: "StLouisFed", title: "St. Louis Fed", url: "https://fredblog.stlouisfed.org/feed/" },
    { id: "IZA", title: "IZA", url: "http://ftp.iza.org/rss.xml" },
    { id: "CEPR", title: "CEPR", url: "https://cepr.org/latest.xml" },
    { id: "OECD", title: "OECD", url: "https://www.oecd.org/rss/" }
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

 // Feed Results component with "Click-Box" cards
function FeedResults({ items, loading }) {
  return html`
    <main role="main" class="max-w-5xl mx-auto px-4 py-8">
      ${loading && html`
        <div class="flex flex-col items-center justify-center py-20">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p class="text-lg font-semibold text-gray-600">Fetching latest news...</p>
        </div>
      `}

      ${!loading && items.length === 0 && html`
        <p class="text-center text-gray-500 text-lg py-20">No matching articles found.</p>
      `}

      <section
        id="listResults"
        class="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2"
        aria-live="polite"
      >
        ${items.map(item => html`
          <a
            href=${item.link}
            target="_blank"
            rel="noopener noreferrer"
            key=${item.link}
            class="group block p-6 bg-white border border-gray-200 rounded-xl shadow-sm 
                   hover:shadow-md hover:border-blue-400 hover:-translate-y-1 
                   transition-all duration-200 ease-in-out cursor-pointer"
          >
            <div class="flex flex-col h-full">
              <!-- Source Badge -->
              <span class="inline-block self-start px-2 py-1 mb-3 text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 rounded-md">
                ${item.source}
              </span>
              
              <!-- Title -->
              <h2 class="text-xl font-bold text-gray-900 group-hover:text-blue-700 leading-tight mb-2">
                ${item.title}
              </h2>
              
              <!-- Date -->
              <time class="text-sm text-gray-400 mb-4">
                ${item.pubDateDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </time>
              
              <!-- Snippet (Trims long HTML) -->
              <div 
                class="text-gray-600 text-sm line-clamp-3 overflow-hidden"
                dangerouslySetInnerHTML=${{ __html: item.description }}
              ></div>
              
              <!-- "Read More" Hint -->
              <div class="mt-auto pt-4 flex items-center text-blue-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                Read full article 
                <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </div>
            </div>
          </a>
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
