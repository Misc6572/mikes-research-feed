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
        description: item.description || ""
      }));
    } catch (e) {
      console.warn(`Skipping feed at ${url} due to error: ${e.message}`);
      return [];
    }
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
            pubDateDate: new Date(i.pubDate)
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
        const matchesSearch = searchTerm === "" || (item.title + item.description).toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSource && matchesSearch;
      });
    }, [feedItems, filterSource, searchTerm]);

    return html`
      <div class="max-w-6xl mx-auto px-4">
        <h1 class="text-4xl font-extrabold text-center mb-6 mt-6 uppercase tracking-wide">MIKE'S AMAZING NEWS FEED</h1>

        <div class="flex flex-col sm:flex-row gap-4 mb-10 justify-center items-center">
          <input
            class="w-full sm:w-80 p-3 border border-gray-400 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="text"
            placeholder="Search titles or descriptions"
            value=${searchTerm}
            onInput=${e => setSearchTerm(e.target.value)}
          />
          <select
            class="w-full sm:w-48 p-3 border border-gray-400 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value=${filterSource}
            onChange=${e => setFilterSource(e.target.value)}
          >
            <option value="ALL">All Sources</option>
            ${FEEDS.map(feed => html`<option value=${feed.title}>${feed.title}</option>`)}
          </select>
        </div>

        ${loading && html`<p class="text-center text-lg">Loading feeds...</p>`}

        ${!loading && filteredItems.length === 0 && html`<p class="text-center text-gray-500 text-lg">No matching articles.</p>`}

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          ${filteredItems.map(item => html`
            <article
              class="bg-white rounded-lg border border-gray-300 p-6 hover:shadow-lg transition-shadow duration-300"
              key=${item.link}
            >
              <a
                href=${item.link}
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-700 hover:underline font-semibold text-xl"
              >
                ${item.title}
              </a>
              <p class="mt-1 text-gray-500 text-sm">${item.source} — ${item.pubDateDate.toLocaleDateString()}</p>
              <p class="mt-3 text-gray-700 line-clamp-4" dangerouslySetInnerHTML=${{ __html: item.description }}></p>
            </article>
          `)}
        </div>
      </div>
    `;
  }

  render(html`<${App} />`, document.getElementById("root"));
};
