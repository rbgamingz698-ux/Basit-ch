import streamlit as st
import feedparser
import requests
import json
import re
from datetime import datetime, timedelta
import pytz

# Page configuration
st.set_page_config(
    page_title="Market News Feed",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Sources list and configuration
SOURCES = {
    "Yahoo Finance Top Stories": "https://finance.yahoo.com/news/rssindex",
    "Yahoo Search Tickers (JSON)": "https://query2.finance.yahoo.com/v1/finance/search",
    "MarketWatch RSS": "https://feeds.content.dowjones.io/public/rss/mw_topstories",
    "Reuters Markets RSS": "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best",
    "CNBC Markets RSS": "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    "Investing.com RSS": "https://www.investing.com/rss/news_301.rss"
}

QUERIES = ["^DJI", "^IXIC", "^NDX", "GC=F", "XAUUSD=X", "wall street"]

PKT_TZ = pytz.timezone("Asia/Karachi")

def clean_html(raw_html):
    """Remove HTML tags from description or text."""
    if not raw_html:
        return ""
    cleanr = re.compile('<.*?>')
    return re.sub(cleanr, '', raw_html)

def parse_time_to_pkt(time_str):
    """Parse various timezone string formats to Asia/Karachi (PKT)."""
    if not time_str:
        return datetime.now(PKT_TZ)
    
    # Common formats
    formats = [
        "%a, %d %b %Y %H:%M:%S %Z",  # Wed, 16 Sep 2026 14:30:00 GMT
        "%a, %d %b %Y %H:%M:%S %z",  # Wed, 16 Sep 2026 14:30:00 +0000
        "%Y-%m-%dT%H:%M:%SZ",        # 2026-09-16T14:30:00Z
        "%Y-%m-%dT%H:%M:%S%z",       # 2026-09-16T14:30:00+00:00
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(time_str, fmt)
            if dt.tzinfo is None:
                dt = pytz.utc.localize(dt)
            return dt.astimezone(PKT_TZ)
        except ValueError:
            continue
            
    # Fallback to current time if unparseable
    return datetime.now(PKT_TZ)

def fetch_rss_source(source_name, url):
    """Fetch and parse RSS feed using feedparser."""
    headlines = []
    try:
        # Use customized User-Agent header for requests first to bypass anti-scraping
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code != 200:
            st.sidebar.warning(f"⚠️ Source Failed: {source_name} returned code {response.status_code}")
            return []
            
        feed = feedparser.parse(response.content)
        for entry in feed.entries:
            title = entry.get("title", "")
            link = entry.get("link", "#")
            
            # Extract publish date
            pub_str = entry.get("published", entry.get("pubDate", entry.get("updated", "")))
            pkt_time = parse_time_to_pkt(pub_str)
            
            # Normalize
            headlines.append({
                "title": title.strip(),
                "source": source_name,
                "publisher": source_name.replace(" RSS", ""),
                "link": link,
                "published_pkt": pkt_time
            })
    except Exception as e:
        st.sidebar.warning(f"⚠️ Error loading {source_name}: {str(e)}")
    return headlines

def fetch_yahoo_json_source():
    """Fetch financial news using Yahoo Finance Search JSON API for configured queries/tickers."""
    headlines = []
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
    
    for query in QUERIES:
        try:
            count = 30 if query == "wall street" else 20
            url = f"https://query2.finance.yahoo.com/v1/finance/search?q={query}&newsCount={count}"
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code != 200:
                continue
                
            data = response.json()
            news_items = data.get("news", [])
            
            for item in news_items:
                title = item.get("title", "")
                link = item.get("link", "#")
                publisher = item.get("publisher", "Yahoo Finance")
                
                # Timestamp is typically in seconds
                pub_sec = item.get("providerPublishTime", 0)
                if pub_sec:
                    dt = datetime.fromtimestamp(pub_sec, tz=pytz.utc)
                    pkt_time = dt.astimezone(PKT_TZ)
                else:
                    pkt_time = datetime.now(PKT_TZ)
                
                headlines.append({
                    "title": title.strip(),
                    "source": f"Yahoo Search JSON ({query})",
                    "publisher": publisher,
                    "link": link,
                    "published_pkt": pkt_time
                })
        except Exception as e:
            # Let other queries continue
            continue
            
    return headlines

@st.cache_data(ttl=300)
def get_all_news():
    """Fetch all sources, merge, normalize, deduplicate, and sort."""
    all_headlines = []
    
    # 1. Yahoo Finance RSS
    all_headlines.extend(fetch_rss_source("Yahoo Finance Top Stories", SOURCES["Yahoo Finance Top Stories"]))
    
    # 2. Yahoo Search JSON API for tickers
    all_headlines.extend(fetch_yahoo_json_source())
    
    # 3. MarketWatch RSS
    all_headlines.extend(fetch_rss_source("MarketWatch RSS", SOURCES["MarketWatch RSS"]))
    
    # 4. Reuters RSS
    all_headlines.extend(fetch_rss_source("Reuters Markets RSS", SOURCES["Reuters Markets RSS"]))
    
    # 5. CNBC RSS
    all_headlines.extend(fetch_rss_source("CNBC Markets RSS", SOURCES["CNBC Markets RSS"]))
    
    # 6. Investing.com RSS
    all_headlines.extend(fetch_rss_source("Investing.com RSS", SOURCES["Investing.com RSS"]))
    
    # Deduplicate based on simplified lower-case title string
    seen_titles = set()
    deduped_headlines = []
    
    for h in all_headlines:
        # Simplify title to catch slight variations
        norm_title = re.sub(r'[^a-zA-Z0-9]', '', h["title"].lower())
        if norm_title not in seen_titles:
            seen_titles.add(norm_title)
            deduped_headlines.append(h)
            
    # Sort by published_pkt newest first
    deduped_headlines.sort(key=lambda x: x["published_pkt"], reverse=True)
    return deduped_headlines

# --- SIDEBAR CONTROLS ---
st.sidebar.title("Market News Controls")
st.sidebar.write("Unified Global Macro Feed")

# Refresh Cache button
if st.sidebar.button("🔄 Clear Cache & Refresh"):
    st.cache_data.clear()
    st.rerun()

# Text search filter
search_query = st.sidebar.text_input("🔍 Search Keywords", "").strip().lower()

# Get available sources for filter
all_news_raw = get_all_news()
available_sources = sorted(list(set(h["source"] for h in all_news_raw)))

# Multiselect source filter
selected_sources = st.sidebar.multiselect(
    "📁 Filter Sources",
    options=available_sources,
    default=available_sources
)

# --- MAIN APP DISPLAY ---
st.title("📰 Market News Feed")
st.write("Real-time aggregated financial intelligence converted to **PKT (Asia/Karachi Timezone)**.")

# Apply filters
filtered_news = [
    h for h in all_news_raw
    if h["source"] in selected_sources
]

if search_query:
    filtered_news = [
        h for h in filtered_news
        if search_query in h["title"].lower() or search_query in h["publisher"].lower()
    ]

# Display count
col_stats1, col_stats2 = st.columns(2)
with col_stats1:
    st.metric("Total Cached Headlines", len(all_news_raw))
with col_stats2:
    st.metric("Filtered Headlines Displayed", len(filtered_news))

st.markdown("---")

# Render News Feed Cards
if len(filtered_news) == 0:
    st.info("No headlines found matching the specified filters or search criteria.")
else:
    for h in filtered_news:
        # Beautiful Card Container
        with st.container():
            time_str = h["published_pkt"].strftime("%Y-%m-%d %I:%M:%S %p PKT")
            
            # Bold title
            st.markdown(f"### {h['title']}")
            
            # Caption with metadata
            st.markdown(
                f"**Source:** `{h['source']}` | **Publisher:** `{h['publisher']}` | **Released:** *{time_str}*"
            )
            
            # Clickable Read More link
            st.markdown(f"[🔗 Read Full Article on {h['publisher']}]({h['link']})")
            
            # Horizontal Divider
            st.markdown("<hr style='margin: 10px 0px; border-color: rgba(255,255,255,0.1);' />", unsafe_allow_name=True)
