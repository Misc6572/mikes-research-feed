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

  // Feed Results component
  function FeedResults({ items, loading }) {
    return html`
      <main role="main" class="max-w-5xl mx-auto px-4 py-8">
        ${loading &&
        html`<p class="text-center text-lg font-semibold">Loading feeds...</p>`}

        ${!loading && items.length === 0 &&
        html`<p class="text-center text-gray-500 text-lg">No matching articles.</p>`}

        <section
          id="listResults"
          class="grid gap-8 sm:grid-cols-1 md:grid-cols-2"
          aria-live="polite"
          aria-atomic="true"
        >
          ${items.map(
            item => html`
              <article
                class="border-2 border-blue-500 rounded-lg p-6 shadow-lg bg-white hover:shadow-2xl transition-shadow duration-300"
                key=${item.link}
                role="article"
                tabindex="0"
              >
                <a
                  href=${item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xl font-semibold text-blue-700 hover:underline break-words"
                >
                  ${item.title}
                </a>
                <p class="mt-1 text-sm text-gray-500">${item.source} — ${item.pubDateDate.toLocaleDateString()}</p>
                <p class="mt-4 text-gray-700" dangerouslySetInnerHTML=${{ __html: item.description }}></p>
              </article>
            `
          )}
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
