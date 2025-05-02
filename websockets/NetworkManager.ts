import { GalaxyClient } from './GalaxyClient';
//import { Event, EventType, Operation, OperationType, Vector2D } from '../proto/galaxy';
import * as Galaxy from '../proto/galaxy';
import { Player } from '../src/player';
import { Food, createFoodFromServer } from '../src/food';
import { Application, Container } from 'pixi.js';

const WORLD_SIZE = { width: 10000, height: 10000 };

type IDHash = number & { readonly __brand: "IDHash" };

function hashID(id: Uint8Array): IDHash {
  let hash = 5381; // DJB2 initial value
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 33) ^ id[i]; // DJB2 hash formula
  }
  return hash >>> 0 as IDHash; // Ensure the hash is a non-negative integer
}

export class NetworkManager {
  private client: GalaxyClient;
  private player: Player;
  private world: Container;
  private app: Application;
  private oldPos: Galaxy.Vector2D | undefined;

  // Entidades del juego
  public foods: Food[] = [];
  public players = new Map<IDHash, Player>();

  constructor(app: Application, world: Container, player: Player, serverUrl: string) {
    this.app = app;
    this.world = world;
    this.player = player;
    this.client = new GalaxyClient(serverUrl);

    this.setupEventHandlers();
  }

  public isConnected() {
    return this.client.isConnected;
  }

  private setupEventHandlers() {
    this.client.onEvent((event) => {
      try {
        switch (event.eventType) {
          case Galaxy.EventType.EvNewPlayer:
            this.handleNewPlayer({
              playerID: event.newPlayerEvent.playerID,
              position: event.newPlayerEvent.position,
              radius: event.newPlayerEvent.radius,
              color: event.newPlayerEvent.color
            });
            break;
          case Galaxy.EventType.EvJoin:
            this.handleJoin({
              playerID: event.joinEvent.playerID,
              position: event.joinEvent.position,
              radius: event.joinEvent.radius,
              color: event.joinEvent.color
            });
            break;
          case Galaxy.EventType.EvPlayerMove:
            this.handlePlayerMove({
              playerID: event.playerMoveEvent.playerID,
              position: event.playerMoveEvent.position
            });
            break;
          case Galaxy.EventType.EvNewFood:
            this.handleNewFood({
              position: event.newFoodEvent.position,
              color: event.newFoodEvent.color
            });
            break;
          case Galaxy.EventType.EvPlayerGrow:
            this.handlePlayerGrow({
              playerID: event.playerGrowEvent.playerID,
              radius: event.playerGrowEvent.radius
            })
            break;
          case Galaxy.EventType.EvDestroyFood:
            this.handleDestroyFood({
              position: event.destroyFoodEvent.position!
            });
            break;
          case Galaxy.EventType.EvDestroyPlayer:
            this.handleDestroyPlayer({
              playerID: event.destroyPlayerEvent.playerID
            });
            break;
          case Galaxy.EventType.EvUnused:
            this.handleDestroyPlayer({
              playerID: event.destroyPlayerEvent.playerID
            });
            break;
        }
      } catch (err) {
        console.error("Error processing event:", err);
      }
    });
  }

  private positionDelta(a: Galaxy.Vector2D | undefined, b: Galaxy.Vector2D | undefined): number {
    if (a === undefined || b === undefined) {
      return 999999
    }
    const deltaX = a.X - b.X;
    const deltaY = a.Y - b.Y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  }

  public sendMovement(x: number, y: number) {
    let vector = { X: Math.floor(x), Y: Math.floor(y) }
    if (this.positionDelta(vector, this.oldPos) < 5) {
      return
    }

    this.oldPos = vector;

    const op: Galaxy.Operation = {
      playerID: this.player.id!,
      operationType: Galaxy.OperationType.OpMove,
        moveOperation: { position: vector }
    };
    this.client.sendOperation(op);
  }

  public sendEatFood(foodPos: { X: number, Y: number }, newRadius: number) {
    const op: Galaxy.Operation = {
      playerID: this.player.id,
      operationType: Galaxy.OperationType.OpEatFood,
      eatFoodOperation: {
        foodPosition: foodPos,
        newRadius: Math.floor(newRadius)
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
        leaveOperation: {} // Sin datos adicionales
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
        eatPlayerOperation: {
          playerEaten: eatenPlayerId,
          newRadius: Math.floor(newRadius)
        }
    };
    this.client.sendOperation(op);
  }

  // Handlers de eventos
  private handleJoin(event: Galaxy.NewPlayerEvent) {
    console.log("registering me", event)
    this.player.id = event.playerID;
    this.player.updateFromServer(event.position!.X, event.position!.Y, event.radius)
    return
  }

  private handleNewPlayer(event: Galaxy.NewPlayerEvent) {
    console.log("new player", event)
    const playerID = hashID(event.playerID);
    if (this.isCurrentPlayer(playerID)) return;

    const player = new Player(
      WORLD_SIZE,
      event.playerID,
      event.position!.X,
      event.position!.Y,
      event.radius,
      event.color
    );

    this.players.set(playerID, player);
    this.world.addChild(player);
  }

  private handlePlayerMove(event: Galaxy.PlayerMoveEvent) {
    const playerID = hashID(event.playerID);
    if (this.isCurrentPlayer(playerID)) {
      this.player.updateFromServer(event.position!.X, event.position!.Y, this.player.radius);
    } else if (this.players.has(playerID)) {
      const player = this.players.get(playerID)!;
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
    const playerID = hashID(event.playerID);
    if (this.isCurrentPlayer(playerID)) {
      this.player.updateRadiusFromServer(event.radius);
    } else if (this.players.has(playerID)) {
      this.players.get(playerID)?.updateRadiusFromServer(event.radius);
    } else {
      console.log("nobody", event, this.players, this.player)
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
    const playerID = hashID(event.playerID);
    if (this.players.has(playerID)) {
      const player = this.players.get(playerID)!;
      player.destroy();
      this.players.delete(playerID);
    }
  }

  private isCurrentPlayer(playerId: IDHash): boolean {
    if (this.player.id === undefined) return false;
    return playerId === hashID(this.player.id);
  }

  public close() {
    this.client.close();
  }
}
