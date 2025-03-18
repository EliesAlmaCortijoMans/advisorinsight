import os
import json
import finnhub
from openai import OpenAI
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
import time
import yfinance as yf

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self):
        try:
            finnhub_key = os.getenv('FINNHUB_API_KEY')
            openai_key = os.getenv('OPENAI_API_KEY')
            
            if not finnhub_key:
                raise ValueError("FINNHUB_API_KEY not found in environment variables")
            if not openai_key:
                raise ValueError("OPENAI_API_KEY not found in environment variables")
                
            self.finnhub_client = finnhub.Client(api_key=finnhub_key)
            self.openai_client = OpenAI(api_key=openai_key)
            logger.info("ChatService initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing ChatService: {str(e)}")
            raise
        
    def get_company_data(self, symbol: str, include_peers: bool = False) -> Dict[str, Any]:
        """Fetch company data from Finnhub"""
        try:
            logger.info(f"Fetching company data for {symbol}")
            
            # Add retry mechanism for Finnhub API calls
            max_retries = 3
            retry_delay = 2
            
            for attempt in range(max_retries):
                try:
                    company_profile = self.finnhub_client.company_profile2(symbol=symbol)
                    if not company_profile:
                        raise ValueError(f"No company profile found for {symbol}")
                    logger.info(f"Company profile received: {company_profile}")
                    
                    basic_financials = self.finnhub_client.company_basic_financials(symbol, 'all')
                    logger.info(f"Basic financials received for {symbol}")
                    
                    # Get stock price data for the last month
                    end_date = datetime.now()
                    start_date = end_date - timedelta(days=30)
                    stock_candles = self.finnhub_client.stock_candles(
                        symbol,
                        'D',
                        int(start_date.timestamp()),
                        int(end_date.timestamp())
                    )
                    logger.info(f"Stock price data received for {symbol}")
                    
                    news = self.finnhub_client.company_news(symbol, 
                        _from=start_date.strftime('%Y-%m-%d'),
                        to=end_date.strftime('%Y-%m-%d'))[:5]
                    logger.info(f"Recent news received for {symbol}: {len(news)} items")
                    
                    # Process news items to include only relevant fields
                    processed_news = []
                    for item in news:
                        processed_news.append({
                            'datetime': datetime.fromtimestamp(item.get('datetime', 0)).strftime('%Y-%m-%d'),
                            'headline': item.get('headline', ''),
                            'summary': item.get('summary', ''),
                            'source': item.get('source', '')
                        })
                    
                    result = {
                        'profile': company_profile,
                        'financials': basic_financials,
                        'recent_news': processed_news,
                        'stock_data': stock_candles
                    }

                    # If peers data is requested, fetch it
                    if include_peers:
                        peers = self.finnhub_client.company_peers(symbol)
                        logger.info(f"Found {len(peers)} peers for {symbol}")
                        
                        # Fetch basic data for each peer
                        peer_data = {}
                        for peer in peers[:5]:  # Limit to top 5 peers to avoid rate limits
                            try:
                                peer_profile = self.finnhub_client.company_profile2(symbol=peer)
                                peer_financials = self.finnhub_client.company_basic_financials(peer, 'all')
                                
                                if peer_profile and peer_financials:
                                    peer_data[peer] = {
                                        'profile': peer_profile,
                                        'financials': peer_financials
                                    }
                            except Exception as peer_error:
                                logger.warning(f"Error fetching data for peer {peer}: {str(peer_error)}")
                                continue
                        
                        result['peers'] = peer_data
                    
                    return result
                except Exception as api_error:
                    if attempt < max_retries - 1:
                        logger.warning(f"Attempt {attempt + 1} failed, retrying in {retry_delay} seconds...")
                        time.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                        continue
                    raise
            
        except Exception as e:
            logger.error(f"Error fetching company data for {symbol}: {str(e)}")
            raise

    def generate_response(self, message: str, symbol: str = None) -> str:
        """Generate a response using OpenAI based on company data or market data"""
        try:
            logger.info(f"Generating response for {'market' if not symbol else symbol} query")
            
            if not symbol:  # Market-specific query
                # Get real-time market data based on the question
                market_data = {}
                message_lower = message.lower()
                
                if any(keyword in message_lower for keyword in ['sector', 'sectors']):
                    # Fetch sector performance data
                    sectors = {
                        "XLK": "Technology",
                        "XLV": "Healthcare", 
                        "XLF": "Financials",
                        "XLE": "Energy",
                        "XLI": "Industrials",
                        "XLC": "Communication"
                    }
                    sector_data = {}
                    for symbol, name in sectors.items():
                        ticker = yf.Ticker(symbol)
                        data = ticker.history(period='1d')
                        if not data.empty:
                            latest_price = data['Close'].iloc[-1]
                            previous_close = data['Close'].iloc[0]
                            change_percent = ((latest_price - previous_close) / previous_close) * 100
                            sector_data[name] = {
                                'price': round(latest_price, 2),
                                'change_percent': round(change_percent, 2)
                            }
                    market_data['sectors'] = sector_data
                    
                elif any(keyword in message_lower for keyword in ['volume', 'trading volume']):
                    # Fetch volume data for major stocks
                    tickers = ["AAPL", "MSFT", "GOOGL", "AMZN", "META"]
                    volume_data = {}
                    for symbol in tickers:
                        ticker = yf.Ticker(symbol)
                        data = ticker.history(period='1d')
                        if not data.empty:
                            volume = data['Volume'].iloc[-1]
                            volume_data[symbol] = {
                                'volume': f"{volume/1e6:.1f}M" if volume < 1e9 else f"{volume/1e9:.1f}B"
                            }
                    market_data['volume'] = volume_data
                    
                elif any(keyword in message_lower for keyword in ['global', 'international']):
                    # Fetch global indices data
                    indices = {'^FTSE': 'FTSE 100', '^N225': 'Nikkei 225'}
                    global_data = {}
                    for symbol, name in indices.items():
                        ticker = yf.Ticker(symbol)
                        data = ticker.history(period='1d')
                        if not data.empty:
                            latest_price = data['Close'].iloc[-1]
                            previous_close = data['Close'].iloc[0]
                            change_percent = ((latest_price - previous_close) / previous_close) * 100
                            global_data[name] = {
                                'price': round(latest_price, 2),
                                'change_percent': round(change_percent, 2)
                            }
                    market_data['global'] = global_data
                    
                elif any(keyword in message_lower for keyword in ['movers', 'gainers', 'losers']):
                    # Fetch top movers data
                    tickers = ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA"]
                    performance_data = []
                    for symbol in tickers:
                        ticker = yf.Ticker(symbol)
                        data = ticker.history(period='1d')
                        if not data.empty:
                            latest_price = data['Close'].iloc[-1]
                            previous_close = data['Close'].iloc[0]
                            change_percent = ((latest_price - previous_close) / previous_close) * 100
                            performance_data.append({
                                'symbol': symbol,
                                'price': round(latest_price, 2),
                                'change_percent': round(change_percent, 2)
                            })
                    performance_data.sort(key=lambda x: x['change_percent'], reverse=True)
                    market_data['movers'] = {
                        'gainers': performance_data[:3],
                        'losers': performance_data[-3:]
                    }
                
                # Get sentiment data from Finnhub if available
                try:
                    sentiment = self.finnhub_client.news_sentiment("SPY")  # Use SPY as market proxy
                    market_data['sentiment'] = {
                        'bullish_percent': sentiment.get('sentiment', {}).get('bullishPercent', 0),
                        'bearish_percent': sentiment.get('sentiment', {}).get('bearishPercent', 0)
                    }
                except Exception as e:
                    logger.warning(f"Failed to fetch sentiment data: {e}")
                
                # Create a prompt with the market data
                prompt = f"""You are a market insights assistant. Answer the following question using the provided real-time market data:

Question: {message}

Real-time Market Data:
{json.dumps(market_data, indent=2)}

Please provide a concise and informative response focusing on the key insights from the data.
If the data doesn't contain information relevant to the question, provide a general market analysis based on the available data.
Use specific numbers and percentages when available, and format currency values appropriately.
"""

                # Generate response using GPT
                response = self.openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a knowledgeable market analyst providing real-time market insights."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=150
                )
                
                return response.choices[0].message.content.strip()
            
            # Handle company-specific queries (existing code)
            logger.info(f"Fetching company data for {symbol}")
            include_peers = any(keyword in message.lower() for keyword in ["compare", "competitor", "peer"])
            company_data = self.get_company_data(symbol, include_peers=include_peers)
            
            if not company_data:
                logger.warning(f"No company data available for {symbol}")
                return "I apologize, but I couldn't fetch the latest company data at the moment."

            # Extract and format only the relevant data based on the question
            profile = company_data['profile']
            financials = company_data['financials']
            metrics = financials.get('metric', {})
            series = financials.get('series', {})
            
            # Helper function to get financial metrics
            def get_financial_metrics():
                # Get the most recent values from quarterly and annual series
                def get_latest_value(metric_name):
                    quarterly = series.get('quarterly', {}).get(metric_name, [])
                    if quarterly:
                        latest = sorted(quarterly, key=lambda x: x.get('period', ''))[-1]
                        return latest.get('v')
                    return None

                return {
                    # Profitability Metrics
                    "gross_margin": {
                        "value": metrics.get('grossMarginAnnual'),
                        "ttm": metrics.get('grossMarginTTM')
                    },
                    "operating_margin": {
                        "value": metrics.get('operatingMarginAnnual'),
                        "ttm": metrics.get('operatingMarginTTM')
                    },
                    "net_margin": {
                        "value": metrics.get('netMarginAnnual'),
                        "ttm": metrics.get('netMarginTTM')
                    },
                    "roa": {
                        "value": metrics.get('roaAnnual'),
                        "ttm": metrics.get('roaTTM')
                    },
                    "roe": {
                        "value": metrics.get('roeAnnual'),
                        "ttm": metrics.get('roeTTM')
                    },

                    # Growth Metrics
                    "revenue_growth": {
                        "ttm": metrics.get('revenueGrowthTTM'),
                        "3y": metrics.get('revenueGrowth3Y'),
                        "5y": metrics.get('revenueGrowth5Y')
                    },
                    "eps_growth": {
                        "ttm": metrics.get('epsGrowthTTM'),
                        "3y": metrics.get('epsGrowth3Y'),
                        "5y": metrics.get('epsGrowth5Y')
                    },

                    # Liquidity Metrics
                    "current_ratio": metrics.get('currentRatioAnnual'),
                    "quick_ratio": metrics.get('quickRatioAnnual'),
                    "cash_ratio": metrics.get('cashRatioAnnual'),

                    # Efficiency Metrics
                    "asset_turnover": metrics.get('assetTurnoverAnnual'),
                    "inventory_turnover": metrics.get('inventoryTurnoverAnnual'),

                    # Valuation Metrics
                    "pe_ratio": {
                        "value": metrics.get('peBasicExcl'),
                        "forward": metrics.get('forwardPE')
                    },
                    "ps_ratio": metrics.get('psAnnual'),
                    "pb_ratio": metrics.get('pbAnnual'),
                    "ev_to_ebitda": metrics.get('evToEbitdaAnnual'),

                    # Debt Metrics
                    "debt_to_equity": metrics.get('totalDebtToEquityAnnual'),
                    "debt_to_assets": metrics.get('totalDebtToTotalAssetsAnnual'),
                    "interest_coverage": metrics.get('interestCoverageAnnual'),

                    # Latest Quarterly Metrics
                    "latest_quarterly": {
                        "revenue": get_latest_value('revenue'),
                        "ebit": get_latest_value('ebit'),
                        "ebitda": get_latest_value('ebitda'),
                        "net_income": get_latest_value('netIncome')
                    }
                }

            # Helper function to analyze stock price movement
            def analyze_stock_movement(stock_data):
                if not stock_data or not stock_data.get('c'):
                    return None
                    
                closes = stock_data['c']
                if not closes:
                    return None
                    
                latest_price = closes[-1]
                month_start_price = closes[0]
                price_change = ((latest_price - month_start_price) / month_start_price) * 100
                
                return {
                    'latest_price': latest_price,
                    'month_start_price': month_start_price,
                    'price_change_percentage': price_change,
                    'highest_price': max(stock_data['h']) if stock_data.get('h') else None,
                    'lowest_price': min(stock_data['l']) if stock_data.get('l') else None
                }

            # Helper function to get revenue data
            def get_revenue_data():
                quarterly_revenue = series.get('quarterly', {}).get('revenue', [])
                annual_revenue = series.get('annual', {}).get('revenue', [])
                
                # Sort by period and get the most recent entries
                quarterly_revenue = sorted(quarterly_revenue, key=lambda x: x.get('period', ''))[-4:] if quarterly_revenue else []
                annual_revenue = sorted(annual_revenue, key=lambda x: x.get('period', ''))[-3:] if annual_revenue else []
                
                return {
                    'quarterly': [{'period': q.get('period'), 'value': q.get('v')} for q in quarterly_revenue],
                    'annual': [{'period': a.get('period'), 'value': a.get('v')} for a in annual_revenue]
                }

            # Format the data based on the question type
            if any(keyword in message.lower() for keyword in ["market", "react", "announcement", "news"]):
                # For market reaction questions, include news and stock price data
                stock_analysis = analyze_stock_movement(company_data.get('stock_data'))
                context_data = {
                    "company_name": profile.get('name'),
                    "recent_news": company_data.get('recent_news', []),
                    "stock_movement": stock_analysis,
                    "market_metrics": {
                        "current_price": stock_analysis.get('latest_price') if stock_analysis else None,
                        "pe_ratio": metrics.get('peBasicExcl'),
                        "market_cap": profile.get('marketCapitalization'),
                        "52_week_high": metrics.get('52WeekHigh'),
                        "52_week_low": metrics.get('52WeekLow')
                    }
                }
            elif "revenue" in message.lower() and "growth" in message.lower():
                # For revenue growth questions, include detailed revenue data
                revenue_data = get_revenue_data()
                context_data = {
                    "company_name": profile.get('name'),
                    "revenue_metrics": {
                        "quarterly_revenue": revenue_data['quarterly'],
                        "annual_revenue": revenue_data['annual'],
                        "revenue_growth": {
                            "ttm": metrics.get('revenueGrowthTTM'),
                            "3y": metrics.get('revenueGrowth3Y'),
                            "5y": metrics.get('revenueGrowth5Y')
                        },
                        "revenue_per_share": {
                            "annual": metrics.get('revenuePerShareAnnual'),
                            "ttm": metrics.get('revenuePerShareTTM')
                        }
                    }
                }
            elif "compare" in message.lower() and "competitor" in message.lower():
                # For competitor comparison, include peer data and metrics
                peer_data = company_data.get('peers', {})
                
                # Calculate peer averages and compile comparison data
                def calculate_peer_metrics(peer_financials):
                    peer_metrics = peer_financials.get('metric', {})
                    return {
                        "pe_ratio": peer_metrics.get('peBasicExcl'),
                        "ps_ratio": peer_metrics.get('psAnnual'),
                        "pb_ratio": peer_metrics.get('pbAnnual'),
                        "debt_to_equity": peer_metrics.get('totalDebtToEquityAnnual'),
                        "gross_margin": peer_metrics.get('grossMarginAnnual'),
                        "operating_margin": peer_metrics.get('operatingMarginAnnual'),
                        "net_margin": peer_metrics.get('netMarginAnnual'),
                        "revenue_growth_ttm": peer_metrics.get('revenueGrowthTTM'),
                        "revenue_growth_3y": peer_metrics.get('revenueGrowth3Y'),
                        "market_cap": peer_financials.get('profile', {}).get('marketCapitalization')
                    }
                
                peer_metrics = {
                    peer_symbol: calculate_peer_metrics(peer_data[peer_symbol]['financials'])
                    for peer_symbol in peer_data
                }
                
                context_data = {
                    "company_name": profile.get('name'),
                    "industry": profile.get('finnhubIndustry'),
                    "company_metrics": {
                        "market_cap": profile.get('marketCapitalization'),
                        "pe_ratio": metrics.get('peBasicExcl'),
                        "ps_ratio": metrics.get('psAnnual'),
                        "pb_ratio": metrics.get('pbAnnual'),
                        "debt_to_equity": metrics.get('totalDebtToEquityAnnual'),
                        "gross_margin": metrics.get('grossMarginAnnual'),
                        "operating_margin": metrics.get('operatingMarginAnnual'),
                        "net_margin": metrics.get('netMarginAnnual'),
                        "revenue_growth_ttm": metrics.get('revenueGrowthTTM'),
                        "revenue_growth_3y": metrics.get('revenueGrowth3Y')
                    },
                    "peer_comparison": {
                        "peer_metrics": peer_metrics,
                        "peer_names": {
                            peer_symbol: peer_data[peer_symbol]['profile'].get('name', peer_symbol)
                            for peer_symbol in peer_data
                        }
                    }
                }
            elif "financial" in message.lower() and "metric" in message.lower():
                # For financial metrics questions
                financial_metrics = get_financial_metrics()
                context_data = {
                    "company_name": profile.get('name'),
                    "industry": profile.get('finnhubIndustry'),
                    "market_cap": profile.get('marketCapitalization'),
                    "financial_metrics": financial_metrics,
                    "company_overview": {
                        "exchange": profile.get('exchange'),
                        "currency": profile.get('currency'),
                        "country": profile.get('country')
                    }
                }
            else:
                # For general questions, provide a balanced overview
                financial_metrics = get_financial_metrics()
                context_data = {
                    "company_name": profile.get('name'),
                    "industry": profile.get('finnhubIndustry'),
                    "market_cap": profile.get('marketCapitalization'),
                    "overview_metrics": {
                        "pe_ratio": financial_metrics['pe_ratio'],
                        "revenue_growth": financial_metrics['revenue_growth'],
                        "net_margin": financial_metrics['net_margin'],
                        "debt_to_equity": financial_metrics['debt_to_equity'],
                        "current_ratio": financial_metrics['current_ratio']
                    }
                }

            # Create context for OpenAI with the filtered data
            base_prompt = """
            You are a financial advisor assistant. Use the following company data to answer the user's question:
            
            Company Data:
            {data}
            
            User Question: {question}
            """
            
            if "compare" in message.lower() and "competitor" in message.lower():
                comparison_prompt = """
                Please provide a detailed comparison between the company and its peers, focusing on:
                1. Market Position:
                   - Compare market capitalizations
                   - Highlight industry position
                
                2. Profitability Metrics:
                   - Compare gross margins, operating margins, and net margins
                   - Explain what these differences mean for competitive position
                
                3. Growth and Efficiency:
                   - Compare revenue growth rates (TTM and 3-year)
                   - Analyze operational efficiency metrics
                
                4. Valuation Metrics:
                   - Compare PE ratios, PS ratios, and PB ratios
                   - Explain if the company is overvalued or undervalued relative to peers
                
                5. Financial Health:
                   - Compare debt levels and leverage metrics
                   - Assess relative financial stability
                
                For each metric:
                - Show the company's value vs. peer average
                - Highlight if the company is performing better or worse
                - Explain the significance of any large differences
                - Express all numbers as percentages where appropriate
                - Round all values to 2 decimal places
                
                Conclude with a summary of the company's competitive strengths and weaknesses.
                """
                context = base_prompt.format(
                    data=json.dumps(context_data, indent=2),
                    question=message
                ) + comparison_prompt
            else:
                metric_prompt = """
                Please provide a clear, concise answer based on the available data. When presenting metrics:
                1. Express all ratios and percentages with 2 decimal places
                2. Group related metrics together (e.g., profitability, growth, efficiency)
                3. Include both TTM (trailing twelve months) and annual values when available
                4. Explain any significant trends or changes
                5. Highlight any particularly strong or weak metrics
                
                Focus on the most relevant information to answer the user's specific question.
                """
                context = base_prompt.format(
                    data=json.dumps(context_data, indent=2),
                    question=message
                ) + metric_prompt

            logger.info("Making request to OpenAI API")
            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a knowledgeable financial advisor assistant. Provide concise, data-driven answers with specific numbers and percentages when available. Always explain what the metrics mean and their significance."},
                    {"role": "user", "content": context}
                ],
                temperature=0.7,
                max_tokens=800  # Increased for more detailed competitor analysis
            )

            answer = response.choices[0].message.content.strip()
            logger.info("Successfully generated response from OpenAI")
            return answer
            
        except ValueError as e:
            logger.error(f"Value error in generate_response: {str(e)}")
            return f"I apologize, but I couldn't find data for {symbol}. Please verify the company symbol."
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            return "I apologize, but I encountered an error while processing your request. Please try again later."

    def get_suggested_questions(self, symbol: str = None) -> List[str]:
        """Generate suggested questions based on available company data or market data"""
        try:
            logger.info(f"Getting suggested questions for {'market' if not symbol else symbol}")
            
            if not symbol:  # Market-specific questions
                return [
                    "What are the top performing sectors today?",
                    "Which stocks have the highest trading volume?",
                    "How are global markets performing?",
                    "What are the biggest market movers today?",
                    "Show me the current market sentiment analysis",
                    "What is the current S&P 500 performance?",
                    "Compare technology sector vs healthcare sector performance",
                    "What are the market trends in the last hour?"
                ]
            
            # Company-specific questions
            company_data = self.get_company_data(symbol)
            if not company_data:
                logger.warning(f"No company data available for {symbol}")
                return []

            company_name = company_data['profile'].get('name', symbol)
            return [
                f"What are the key financial metrics for {company_name}?",
                "How has the market reacted to recent announcements?",
                "What is the company's revenue growth trend?",
                "What are the major risks facing the company?",
                "How does the company compare to its competitors?"
            ]
            
        except Exception as e:
            logger.error(f"Error getting suggested questions: {str(e)}")
            return [] 