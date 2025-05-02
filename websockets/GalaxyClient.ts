import type { Event as GalaxyEvent, Operation } from "../proto/galaxy";
import { Event as EventClass, Operation as OperationClass } from "../proto/galaxy";

// Definimos un tipo local para los handlers para evitar ambigüedades
type GalaxyEventHandler = (event: GalaxyEvent) => void; // Usamos el tipo importado

export class GalaxyClient {
    private socket!: WebSocket;
    private eventHandlers: GalaxyEventHandler[] = [];
    private reconnectAttempts: number = 0;
    private readonly maxReconnectAttempts: number = 5;
    private readonly reconnectInterval: number = 3000;

    constructor(private readonly url: string) {
        this.connect();
    }

    private connect(): void {
        this.socket = new WebSocket(this.url);
        this.socket.binaryType = "arraybuffer";
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.socket.onopen = () => {
            console.log("WebSocket connected");
            this.reconnectAttempts = 0;
        };

        this.socket.onmessage = (e: MessageEvent) => {
            try {
                const data = new Uint8Array(e.data);
                const event = EventClass.decode(data);
                this.notifyEventHandlers(event);
            } catch (err) {
                console.error("Error decoding event:", err);
            }
        };

        this.socket.onclose = () => {
            console.log("WebSocket disconnected");
            this.handleReconnection();
        };

        this.socket.onerror = (error: Event) => { // Aquí usamos el Event global del DOM
            console.error("WebSocket error:", error);
        };
    }

    private handleReconnection(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
                console.log(`Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                this.connect();
            }, this.reconnectInterval);
        }
    }

    public onEvent(handler: GalaxyEventHandler): void {
        this.eventHandlers.push(handler);
    }

    private notifyEventHandlers(event: GalaxyEvent): void {
        this.eventHandlers.forEach(handler => {
            try {
                handler(event);
            } catch (err) {
                console.error("Error in event handler:", err);
            }
        });
    }

    public async sendOperation(op: Operation): Promise<void> {
        if (this.socket.readyState !== WebSocket.OPEN) {
            throw new Error("WebSocket is not connected");
        }

        try {
            const buffer = OperationClass.encode(op).finish();
            this.socket.send(buffer);
        } catch (err) {
            throw new Error(`Failed to send operation: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    public close(): void {
      console.log('closing socket')
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.close();
        }
    }

    public get isConnected(): boolean {
        return this.socket.readyState === WebSocket.OPEN;
    }
}
