import { Graphics, Rectangle } from 'pixi.js';
import { Food, FOOD_RADIUS } from './food';

export class Player extends Graphics {
  private velocityMagnitude = 10;
  public id: Uint8Array | undefined;
  public radius: number;
  public color: number;
  public username: string;
  public pos: { x: number; y: number };
  private worldBounds: WorldBounds;

  constructor(worldBounds: WorldBounds, id: Uint8Array | undefined, username: string, x: number, y: number, radius: number, color: number) {
      super();
      this.worldBounds = worldBounds;
      this.id = id;
      this.username = username;
      this.radius = radius;
      this.color = color;
      this.pos = { x, y };
      this.draw();
  }

  private draw() {
    if (this.destroyed) return;
      this.clear();
      this.circle(this.pos.x, this.pos.y, this.radius);
      this.fill(this.color);
      this.stroke({ width: 3, color: 0x0 });
  }

  // Actualización desde el servidor
  public updateFromServer(x: number, y: number, radius: number, skin: number) {
    this.pos.x = x;
      this.pos.y = y;
      this.radius = radius;
      this.color = skin;
      this.draw();
  }

  public updateRadiusFromServer(radius: number) {
      console.log("player = ", this.id?.toString(), ", radius = ", this.radius)
      this.radius = radius;
      this.draw();
  }

  public eatFood(foodEaten: Food) {
    if (this.destroyed) return;
    // increase surface not radius
    this.radius = Math.sqrt(this.radius * this.radius + FOOD_RADIUS * FOOD_RADIUS) * 1.0002;
    foodEaten.destroy();
    this.draw();
  }

  public canEatFood(food: Food) {
    if (this.destroyed) return false;
    if (food.destroyed) return false;

    const playerCenterX = this.pos.x;
    const playerCenterY = this.pos.y;
    const foodCenterX = food.pos.x;
    const foodCenterY = food.pos.y;

    const dx = foodCenterX - playerCenterX;
    const dy = foodCenterY - playerCenterY;

    // Compare squared distances
    const distanceSquared = dx * dx + dy * dy;
    const radiusSquared = this.radius * this.radius;

    return distanceSquared <= radiusSquared;
  }

  public eatPlayer(playerEaten: Player){
    if (this.destroyed) return;
    if (playerEaten.destroyed) return;
    // increase surface not radius
    this.radius = Math.sqrt(this.radius * this.radius + playerEaten.radius * playerEaten.radius) * 1.002;
    this.draw();
  }

  public canEatPlayer(player: Player){
    if (this.destroyed) return false;
    if (player.destroyed) return false;

    const playerCenterX = this.pos.x;
    const playerCenterY = this.pos.y;
    const foodCenterX = player.pos.x;
    const foodCenterY = player.pos.y;

    const dx = foodCenterX - playerCenterX;
    const dy = foodCenterY - playerCenterY;

    // Compare squared distances
    const distanceSquared = dx * dx + dy * dy;
    const radiusSquared = this.radius * this.radius;

    return distanceSquared < radiusSquared;
  }

  // TODO: optimize me
  private calculateMaxDistance(screen: Rectangle): number {
    return Math.sqrt(
      (screen.width / 2) * (screen.width / 2) +
      (screen.height / 2) * (screen.height / 2)
    );
  }

  public moveTowards(screen: Rectangle, x: number, y: number) {
    if (this.destroyed) return;
    const dx = x - screen.width / 2;
    const dy = y - screen.height / 2;
    const delta = Math.sqrt(dx * dx + dy * dy);

    const maxDistance = this.calculateMaxDistance(screen);
    const normalizedDistance = Math.min((delta / maxDistance) * 2, 1);
    //const velocity = (normalizedDistance * this.velocityMagnitude) / Math.sqrt(this.radius / 20);
    const effectiveRadius = Math.max(this.radius, 40);
    const boost = Math.min((effectiveRadius - 80) / 300, 0.4); // hasta +40% si radius ≥ 200
    const velocity = (normalizedDistance * this.velocityMagnitude) * (1 + boost) / Math.pow(effectiveRadius / 80, 0.3);


    // Don't move if the distance is minimal
    if (delta > 3) {
      this.pos.x += (dx / delta) * velocity;
      this.pos.y += (dy / delta) * velocity;

      // Bound checking
      this.pos.x = Math.max(0, Math.min(this.pos.x, this.worldBounds.width))
      this.pos.y = Math.max(0, Math.min(this.pos.y, this.worldBounds.height))

      this.draw();
    }
  }
}
