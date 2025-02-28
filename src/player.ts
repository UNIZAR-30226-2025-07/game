import {
  Graphics,
} from 'pixi.js';
import { Food, FOOD_RADIUS } from './food';


// El servidor nos va a dar una posición relativa al mapa. (200, 300)
// Esto lo convertiremos a (0, 0).

export class Player extends Graphics {
  private velocityMagnitude = 0.005;
  private radius: number;
  private color: number;
  private pos: {
    x: number,
    y: number,
  };

  constructor(x: number, y: number, radius: number, color: number) {
    super();
    this.radius = radius;
    this.color = color;
    this.pos = { x, y };
    this.draw();
  }

  private draw() {
    this.clear();
    this.circle(this.pos.x, this.pos.y, this.radius);
    this.fill(this.color);
  }

  public eatPlayer(playerEaten: Player) {
    this.radius += playerEaten.radius;
    playerEaten.destroy();
    this.draw();
  }

  public eatFood(foodEaten: Food) {
    this.radius += FOOD_RADIUS;
    foodEaten.destroy();
    this.draw();
  }

  public moveTowards(x: number, y: number) {
    x = (x - this.pos.x) * this.velocityMagnitude;
    y = (y - this.pos.y) * this.velocityMagnitude;

    this.pos.x += x;
    this.pos.y += y;
    this.draw();
  }
}
