type PriceUpdateCallback = (data: any) => void;

export class StockWebSocket {
    private static instance: StockWebSocket;
    private ws: WebSocket | null = null;
    private callbacks: Map<string, PriceUpdateCallback> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 30;
    private reconnectTimeout: number = 1000;
    private subscribedSymbols: Set<string> = new Set();
    private lastMessageTime: number = 0;
    private messageTimeout: number | null = null;
    private reconnectTimer: number | null = null;

    private constructor() {}

    static getInstance(): StockWebSocket {
        if (!StockWebSocket.instance) {
            StockWebSocket.instance = new StockWebSocket();
        }
        return StockWebSocket.instance;
    }

    setUpdateCallback(symbol: string, callback: PriceUpdateCallback) {
        this.callbacks.set(symbol, callback);
    }

    removeUpdateCallback(symbol: string) {
        this.callbacks.delete(symbol);
    }

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN) return;

        try {
            this.ws = new WebSocket('ws://localhost:8000/ws/stock/');

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                this.reconnectTimeout = 1000;
                this.resubscribeToSymbols();
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.handleDisconnect();
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.handleDisconnect();
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(event);
            };

        } catch (error) {
            console.error('Error connecting to WebSocket:', error);
            this.handleDisconnect();
        }
    }

    private handleMessage(event: MessageEvent) {
        try {
            const data = JSON.parse(event.data);
            this.lastMessageTime = Date.now();
            
            if (this.messageTimeout) {
                clearTimeout(this.messageTimeout);
            }
            
            this.messageTimeout = window.setTimeout(() => {
                console.log('No messages received for 10 seconds, reconnecting...');
                this.reconnect();
            }, 10000);

            if (data.error) {
                console.error('WebSocket error:', data.error);
                return;
            }

            if (data.symbol && this.subscribedSymbols.has(data.symbol)) {
                const callback = this.callbacks.get(data.symbol);
                if (callback) {
                    callback({
                        ...data,
                        type: 'price_update'
                    });
                }
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    }

    private handleDisconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            console.log(`Reconnecting in ${this.reconnectTimeout / 1000} seconds...`);
            this.reconnectTimer = window.setTimeout(() => {
                this.reconnectAttempts++;
                this.reconnectTimeout = Math.min(this.reconnectTimeout * 1.5, 30000);
                this.connect();
            }, this.reconnectTimeout);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }

    private reconnect() {
        if (this.ws) {
            this.ws.close();
        }
        this.connect();
    }

    private resubscribeToSymbols() {
        this.subscribedSymbols.forEach(symbol => {
            this.sendSubscription(symbol);
        });
    }

    private sendSubscription(symbol: string) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                symbol: symbol
            }));
        }
    }

    subscribeToSymbol(symbol: string, callback: PriceUpdateCallback) {
        this.subscribedSymbols.add(symbol);
        this.setUpdateCallback(symbol, callback);
        this.sendSubscription(symbol);
    }

    unsubscribeFromSymbol(symbol: string) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'unsubscribe',
                symbol: symbol
            }));
        }
        this.subscribedSymbols.delete(symbol);
        this.removeUpdateCallback(symbol);
    }

    disconnect() {
        this.subscribedSymbols.clear();
        this.callbacks.clear();
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
} 