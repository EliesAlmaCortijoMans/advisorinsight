type PriceUpdateCallback = (data: any) => void;

export class StockWebSocket {
    private static instance: StockWebSocket | null = null;
    private ws: WebSocket | null = null;
    private currentSymbol: string | null = null;
    private updateCallback: PriceUpdateCallback | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 30;
    private reconnectTimeout = 2000; // Start with 2 seconds
    private isReconnecting = false;

    private constructor(callback: PriceUpdateCallback) {
        this.updateCallback = callback;
    }

    public static getInstance(callback?: PriceUpdateCallback): StockWebSocket {
        if (!StockWebSocket.instance && callback) {
            StockWebSocket.instance = new StockWebSocket(callback);
        } else if (!StockWebSocket.instance) {
            throw new Error('StockWebSocket must be initialized with a callback first');
        }
        return StockWebSocket.instance;
    }

    public connect(): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return;
        }

        console.log('Connecting to WebSocket...');
        try {
            this.ws = new WebSocket('ws://localhost:8000/ws/stock/');
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                this.reconnectTimeout = 2000;
                this.isReconnecting = false;
                
                // Resubscribe to symbol if there was one
                if (this.currentSymbol) {
                    this.subscribeToSymbol(this.currentSymbol);
                }
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Received WebSocket message:', data);
                    
                    if (data.error) {
                        console.error('WebSocket error:', data.error);
                        return;
                    }

                    // Only process price updates for the current symbol
                    if (data.symbol === this.currentSymbol && this.updateCallback) {
                        this.updateCallback(data);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.ws.onclose = () => {
                console.log('WebSocket closed');
                this.ws = null;
                
                if (!this.isReconnecting) {
                    this.reconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.ws?.close();
            };
        } catch (error) {
            console.error('Error creating WebSocket:', error);
            this.reconnect();
        }
    }

    private reconnect(): void {
        if (this.isReconnecting) {
            return;
        }

        this.isReconnecting = true;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached, resetting...');
            this.reconnectAttempts = 0;
            this.reconnectTimeout = 2000;
        }

        console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
        
        setTimeout(() => {
            this.reconnectAttempts++;
            this.reconnectTimeout = Math.min(this.reconnectTimeout * 2, 30000); // Max 30 seconds
            this.connect();
        }, this.reconnectTimeout);
    }

    public subscribeToSymbol(symbol: string): void {
        this.currentSymbol = symbol;
        
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.log('WebSocket not ready, connecting...');
            this.connect();
            return;
        }

        console.log('Subscribing to symbol:', symbol);
        this.ws.send(JSON.stringify({
            type: 'subscribe',
            symbol: symbol
        }));
    }

    public disconnect(): void {
        console.log('Disconnecting WebSocket');
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.currentSymbol = null;
        this.reconnectAttempts = 0;
        this.reconnectTimeout = 2000;
        this.isReconnecting = false;
    }
} 