import { Graphics } from "pixi.js";
import { Food as ProtoFood } from "../proto/galaxy";

export const FOOD_RADIUS = 20;

export enum FoodColor {
  Red = 0xff0000,
  Blue = 0x0000ff,
  Yellow = 0x00ff00,
}

export class Food extends Graphics {
  public pos: { x: number; y: number };

  constructor(x: number, y: number, color: number) {
      super();
      this.pos = { x, y };
      this.circle(x, y, FOOD_RADIUS);
      this.fill(color);
  }
}

// Nueva función para crear comida desde eventos del servidor
export function createFoodFromServer(event: ProtoFood): Food {
  const defaultPos = { X: 0, Y: 0 };
  const pos = event.position ?? defaultPos;
  
  return new Food(
    pos.X,
    pos.Y,
    event.color ?? 0xffffff // Color blanco por defecto
  );
}
