import { GalaxyClient } from './GalaxyClient';
//import { Event, EventType, Operation, OperationType, Vector2D } from '../proto/galaxy';
import * as Galaxy from '../proto/galaxy';
import { Player } from '../src/player';
import { Food, createFoodFromServer } from '../src/food';
import { Bot } from '../src/bot';
import { Application, Container } from 'pixi.js';

const WORLD_SIZE = { width: 10000, height: 10000 };

export class NetworkManager {
    private client: GalaxyClient;
    private player: Player;
    private world: Container;
    private app: Application;
    
    // Entidades del juego
    public foods: Food[] = [];
    public players = new Map<string, Player>();
    public bots = new Map<string, Bot>();

    constructor(app: Application, world: Container, player: Player, serverUrl: string) {
        this.app = app;
        this.world = world;
        this.player = player;
        this.client = new GalaxyClient(serverUrl);

        this.setupEventHandlers();
        this.sendJoinRequest();
    }

    public isConnected() {
      return this.client.isConnected()
    }

    private setupEventHandlers() {
        this.client.onEvent((event) => {
            try {
                switch (event.eventType) {
                    case Galaxy.EventType.EvNewPlayer:
                        if (event.eventData?.$case === "newPlayerEvent") {
                            this.handleNewPlayer({
                                playerID: event.eventData.newPlayerEvent.playerID,
                                position: event.eventData.newPlayerEvent.position,
                                radius: event.eventData.newPlayerEvent.radius,
                                color: event.eventData.newPlayerEvent.color
                            });
                        }
                        break;
                    case Galaxy.EventType.EvPlayerMove:
                        if (event.eventData?.$case === "playerMoveEvent") {
                            this.handlePlayerMove({
                                playerID: event.eventData.playerMoveEvent.playerID,
                                position: event.eventData.playerMoveEvent.position
                            });
                        }
                        break;
                    case Galaxy.EventType.EvNewFood:
                        if (event.eventData?.$case === "newFoodEvent") {
                            this.handleNewFood({
                                position: event.eventData.newFoodEvent.position,
                                color: event.eventData.newFoodEvent.color
                            });
                        }
                        break;
                    case Galaxy.EventType.EvPlayerGrow:
                        if (event.eventData?.$case === "playerGrowEvent") {
                            this.handlePlayerGrow({
                                playerID: event.eventData.playerGrowEvent.playerID,
                                radius: event.eventData.playerGrowEvent.radius
                            });
                        }
                        break;
                    case Galaxy.EventType.EvDestroyFood:
                        if (event.eventData?.$case === "destroyFoodEvent") {
                            this.handleDestroyFood({
                                position: event.eventData.destroyFoodEvent.position!
                            });
                        }
                        break;
                    case Galaxy.EventType.EvDestroyPlayer:
                        if (event.eventData?.$case === "destroyPlayerEvent") {
                            this.handleDestroyPlayer({
                                playerID: event.eventData.destroyPlayerEvent.playerID
                            });
                        }
                        break;
                }
            } catch (err) {
                console.error("Error processing event:", err);
            }
        });
    }

    private sendJoinRequest() {
        const op: Galaxy.Operation = {
            playerID: this.player.id,
            operationType: Galaxy.OperationType.OpJoin,
            operationData: {
                $case: "joinOperation",
                joinOperation: {}  // JoinOperation vacío si no tiene campos
            }
        };
        this.client.sendOperation(op);
    }
    
    public sendMovement(x: number, y: number) {
        const worldPos = this.screenToWorld(x, y);
        
        const op: Galaxy.Operation = {
            playerID: this.player.id,
            operationType: Galaxy.OperationType.OpMove,
            operationData: {
                $case: "moveOperation",
                moveOperation: { position: worldPos }
            }
        };
        this.client.sendOperation(op);
    }
    
    public sendEatFood(foodPos: {X: number, Y: number}, newRadius: number) {
        const op: Galaxy.Operation = {
            playerID: this.player.id,
            operationType: Galaxy.OperationType.OpEatFood,
            operationData: {
                $case: "eatFoodOperation",
                eatFoodOperation: {
                    foodPosition: foodPos,
                    newRadius: newRadius
                }
            }
        };
        this.client.sendOperation(op);
    }

    /**
     * Enviar operación de abandono del juego
     */
    public sendLeave() {
        const op: Galaxy.Operation = {
            playerID: this.player.id,
            operationType: Galaxy.OperationType.OpLeave,
            operationData: {
                $case: "leaveOperation",
                leaveOperation: {} // Sin datos adicionales
            }
        };
        this.client.sendOperation(op);
    }

    /**
     * Enviar operación de comer jugador
     * @param eatenPlayerId ID del jugador comido
     * @param newRadius Nuevo radio después de comer
     */
    public sendEatPlayer(eatenPlayerId: Uint8Array, newRadius: number) {
        const op: Galaxy.Operation = {
            playerID: this.player.id,
            operationType: Galaxy.OperationType.OpEatPlayer,
            operationData: {
                $case: "eatPlayerOperation",
                eatPlayerOperation: {
                    playerEaten: eatenPlayerId,
                    newRadius: newRadius
                }
            }
        };
        this.client.sendOperation(op);
    }


    private screenToWorld(screenX: number, screenY: number): Galaxy.Vector2D {
        return {
            X: (screenX - this.world.x) / this.world.scale.x,
            Y: (screenY - this.world.y) / this.world.scale.y
        };
    }

    // Handlers de eventos
    private handleNewPlayer(event: Galaxy.NewPlayerEvent) {
        if (this.isCurrentPlayer(event.playerID)) return;

        const player = new Player(
            WORLD_SIZE,
            event.playerID,
            event.position!.X,
            event.position!.Y,
            event.radius,
            event.color
        );
        
        this.players.set(this.idToString(event.playerID), player);
        this.world.addChild(player);
    }

    private handlePlayerMove(event: Galaxy.PlayerMoveEvent) {
        const playerId = this.idToString(event.playerID);
        
        if (this.isCurrentPlayer(event.playerID)) {
            this.player.updateFromServer(event.position!.X, event.position!.Y, this.player.radius);
        } else if (this.players.has(playerId)) {
            const player = this.players.get(playerId)!;
            player.updateFromServer(event.position!.X, event.position!.Y, player.radius);
        }
    }

    private handleNewFood(event: Galaxy.NewFoodEvent) {
        const food = createFoodFromServer({
            position: { X: event.position!.X, Y: event.position!.Y },
            color: event.color
        });
        this.foods.push(food);
        this.world.addChild(food);
    }

    private handlePlayerGrow(event: Galaxy.PlayerGrowEvent) {
        const playerId = this.idToString(event.playerID);
        
        if (this.isCurrentPlayer(event.playerID)) {
            this.player.radius = event.radius;
        } else if (this.players.has(playerId)) {
            this.players.get(playerId)!.radius = event.radius;
        }
    }

    private handleDestroyFood(event: Galaxy.DestroyFoodEvent) {
        const index = this.foods.findIndex(f => 
            f.pos.x === event.position!.X && 
            f.pos.y === event.position!.Y
        );
        
        if (index !== -1) {
            this.world.removeChild(this.foods[index]);
            this.foods[index].destroy();
            this.foods.splice(index, 1);
        }
    }

    private handleDestroyPlayer(event: Galaxy.DestroyPlayerEvent) {
        const playerId = this.idToString(event.playerID);
        
        if (this.players.has(playerId)) {
            const player = this.players.get(playerId)!;
            this.world.removeChild(player);
            player.destroy();
            this.players.delete(playerId);
        }
    }

    private isCurrentPlayer(playerId: Uint8Array): boolean {
        return this.idToString(playerId) === this.idToString(this.player.id);
    }

    private idToString(id: Uint8Array): string {
        return Array.from(id).join('-');
    }

    public close() {
        this.client.close();
    }
}
