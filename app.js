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
      <header role="banner" class="w-full bg-white py-12 border-b border-gray-200">
        <div class="max-w-5xl mx-auto px-4 text-center">
          <h1 class="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-8 text-black">
            MIKE'S AMAZING NEWS FEED
          </h1>

          <form
            class="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-2xl mx-auto"
            onSubmit=${e => e.preventDefault()}
          >
            <input
              class="w-full sm:flex-1 p-4 rounded-none border-2 border-black focus:bg-yellow-50 outline-none transition-colors placeholder-gray-400"
              type="search"
              placeholder="Search intelligence..."
              value=${searchTerm}
              onInput=${e => setSearchTerm(e.target.value)}
            />
            <select
              class="w-full sm:w-auto p-4 rounded-none border-2 border-black bg-white font-bold uppercase text-xs tracking-widest cursor-pointer hover:bg-gray-50"
              value=${filterSource}
              onChange=${e => setFilterSource(e.target.value)}
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
