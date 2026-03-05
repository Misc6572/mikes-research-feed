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
      <header role="banner" class="w-full bg-white py-12 border-b-4 border-black">
        <div class="max-w-5xl mx-auto px-4">
          
          <!-- Title: Centered and Clean -->
          <h1 class="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-8 text-center text-black">
            MIKE'S AMAZING NEWS FEED
          </h1>

          <!-- Form: Centered and Clean -->
          <div class="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-2xl mx-auto">
            <input
              class="w-full sm:flex-1 p-4 border-2 border-black focus:ring-2 focus:ring-blue-500 outline-none"
              type="search"
              placeholder="Search news..."
              value=${searchTerm}
              onInput=${e => setSearchTerm(e.target.value)}
            />
            <select
              class="w-full sm:w-auto p-4 border-2 border-black bg-white font-bold"
              value=${filterSource}
              onChange=${e => setFilterSource(e.target.value)}
            >
              <option value="ALL">All Sources</option>
              ${sources.map(src => html`<option value=${src}>${src}</option>`)}
            </select>
          </div>
          
        </div>
      </header>
    `;
  }

  
  // Feed Results component: High-Margin "Magazine" Layout
  function FeedResults({ items, loading }) {
    return html`
      <main role="main" class="max-w-4xl mx-auto px-4 py-8">
        ${loading && html`
          <div class="flex flex-col items-center justify-center py-20">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-black mb-4"></div>
            <p class="text-xl font-bold tracking-tighter uppercase">Analyzing Intelligence...</p>
          </div>
        `}

        <section id="listResults" class="flex flex-col" aria-live="polite">
          ${items.map(
            (item) => html`
              <article 
                key=${item.link} 
                class="py-24 first:pt-12 border-b border-gray-100 last:border-0"
                role="article"
              >
                <!-- Source Badge -->
                <div class="mb-6">
                  <span class="text-xs font-black bg-black text-white px-2 py-1 uppercase tracking-widest">
                    ${item.source}
                  </span>
                </div>

                <!-- Title (The Big Header) -->
                <h2 class="mb-4">
                  <a
                    href=${item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-4xl md:text-5xl font-extrabold text-black hover:text-blue-800 transition-colors leading-none tracking-tight block"
                  >
                    ${item.title}
                  </a>
                </h2>

                <!-- Meta Info -->
                <div class="flex items-center gap-4 mb-8 text-sm font-bold text-gray-400 uppercase tracking-tighter">
                  <time>${item.pubDateDate.toLocaleDateString()}</time>
                  <span>•</span>
                  <span>Expert Analysis</span>
                </div>

                <!-- Description/Body -->
                <div 
                  class="text-gray-700 text-xl leading-relaxed prose prose-lg max-w-none" 
                  dangerouslySetInnerHTML=${{ __html: item.description }}
                ></div>
                
                <!-- This creates the "5 extra returns" effect visually -->
                <div class="mt-20"></div>
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
