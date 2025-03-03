export class StockWebSocket {
    private static instance: StockWebSocket | null = null;
    private ws: WebSocket | null = null;
    private symbol: string | null = null;
    private onPriceUpdate: (data: any) => void;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectTimeout: number = 5000;
    private pingInterval: number | null = null;
    private lastUpdateTime: number = 0;
    private updateThrottle: number = 2000; // Minimum ms between updates
    private currentSymbol: string | null = null;

    private constructor(onPriceUpdate: (data: any) => void) {
        this.onPriceUpdate = onPriceUpdate;
    }

    public static getInstance(onPriceUpdate: (data: any) => void): StockWebSocket {
        if (!StockWebSocket.instance) {
            StockWebSocket.instance = new StockWebSocket(onPriceUpdate);
        }
        return StockWebSocket.instance;
    }

    private handleMessage(data: any) {
        if (data.error) {
            console.error('WebSocket error:', data.error);
            return;
        }

        // Ensure we have valid price data and enough time has passed since last update
        const currentTime = Date.now();
        if (typeof data.price === 'number' && !isNaN(data.price) &&
            currentTime - this.lastUpdateTime >= this.updateThrottle) {
            this.lastUpdateTime = currentTime;
            this.onPriceUpdate(data);
        }
    }

    private setupPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        this.pingInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN && this.symbol) {
                this.ws.send(JSON.stringify({ 
                    type: 'ping',
                    symbol: this.symbol
                }));
            } else if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                this.reconnect();
            }
        }, 5000);  // Keep ping at 5 seconds
    }

    private reconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
            this.connect();
        } else {
            console.error('Max reconnection attempts reached');
        }
    }

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        console.log('Connecting to WebSocket server...');
        this.ws = new WebSocket('ws://localhost:8000/ws/stock/');
        
        this.ws.onopen = () => {
            console.log('WebSocket Connected');
            this.reconnectAttempts = 0;
            this.setupPing();
            if (this.currentSymbol) {
                this.subscribeToSymbol(this.currentSymbol);
            }
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (!data.error) {
                this.handleMessage(data);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket Error:', error);
        };

        this.ws.onclose = () => {
            console.log('WebSocket Disconnected');
            if (this.pingInterval) {
                clearInterval(this.pingInterval);
            }
            this.ws = null;

            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
                setTimeout(() => this.connect(), this.reconnectTimeout);
            } else {
                console.error('Max reconnection attempts reached');
            }
        };
    }

    subscribeToSymbol(symbol: string) {
        console.log('Subscribing to symbol:', symbol);  // Debug log
        this.currentSymbol = symbol;
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'subscribe',  // Make sure to include the type
                symbol: symbol
            }));
        } else {
            this.connect();
        }
    }

    disconnect() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
} 