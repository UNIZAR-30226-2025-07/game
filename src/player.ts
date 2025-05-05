import { Graphics, Rectangle, Sprite, Assets, Container } from 'pixi.js';
import { Food, FOOD_RADIUS } from './food';
import { Bot } from './bot';

export class Player extends Container {
  public id: Uint8Array;
  public radius: number;
  private color: number;
  public pos: { x: number; y: number };
  private worldBounds: WorldBounds;
  public skinSprite: Sprite | null = null;
  private graphics: Graphics;
  private velocityMagnitude: number;

  constructor(worldBounds: WorldBounds, id: Uint8Array, x: number, y: number, radius: number, color: number, skin: string) {
    super();
      this.worldBounds = worldBounds;
      this.id = id;
      this.radius = radius;
      this.color = color;
      this.pos = { x, y };
      this.velocityMagnitude = 5; // Valor inicial para la velocidad
      // Crear el objeto Graphics para dibujar el jugador
      this.graphics = new Graphics();
      this.updateSkin(skin);
      this.addChild(this.graphics);
      this.draw();
  }

  public async updateSkin(skin: string) {

    if (!skin) {
      console.log("❌ No se proporcionó una skin. Dibujando el círculo con el color predeterminado.");
      if (this.skinSprite) {
          this.removeChild(this.skinSprite);
          this.skinSprite.destroy();
          this.skinSprite = null;
      }
      return;
    }
    
    const texturePath = `/images/aspectos/${skin}`;
    console.log("🖼️ Intentando cargar skin desde:", texturePath);

    try {
      const texture = await Assets.load(texturePath);
      console.log("✅ Textura cargada:", texturePath);

      if (!this.skinSprite) {
          // Si no existe un sprite de skin, créalo y añádelo al contenedor
          this.skinSprite = new Sprite(texture);
          this.skinSprite.anchor.set(0.5);
          this.addChildAt(this.skinSprite, 1); // Asegúrate de que esté detrás del círculo
      } else {
          // Si ya existe, actualiza la textura
          this.skinSprite.texture = texture;
      }
      this.skinSprite.position.set(this.pos.x, this.pos.y); // Centrado en el jugador
        this.skinSprite.width = this.radius * 2;
        this.skinSprite.height = this.radius * 2;

        console.log("✅ Skin actualizada correctamente");
    } catch (e) {
        console.error("❌ Error al cargar la textura:", e);
        if (this.skinSprite) {
            this.removeChild(this.skinSprite);
            this.skinSprite.destroy();
            this.skinSprite = null;
        }
    }
  }


  private draw() {
    if (this.destroyed) return;
      //this.clear();
      //this.circle(this.pos.x, this.pos.y, this.radius);
      //this.fill(this.color);
      //this.stroke({ width: 3, color: 0x0 });

        this.graphics.clear();
        this.graphics.lineStyle(3, 0x000000);
        this.graphics.beginFill(this.color);
        this.graphics.drawCircle(this.pos.x, this.pos.y, this.radius); // Centrado en (0, 0)
        this.graphics.endFill();
  }

  // Actualización desde el servidor
  public async updateFromServer(x: number, y: number, radius: number, skin: string) {
      this.pos.x = x;
      this.pos.y = y;
      this.radius = radius;
      this.position.set(x, y); // Actualiza la posición del contenedor
      await this.updateSkin(skin);
      this.draw();
  }

  public eatPlayer(playerEaten: Player) {
    if (this.destroyed) return;
    this.radius = Math.sqrt(this.radius * this.radius + playerEaten.radius * playerEaten.radius);
    playerEaten.destroy({context: false});
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

  public eatBot(botEaten: Bot){
    if (this.destroyed) return;
    // increase surface not radius
    this.radius = Math.sqrt(this.radius * this.radius + botEaten.radius * botEaten.radius) * 1.002;
    botEaten.destroy();
    this.draw();
  }

  public canEatBot(bot: Bot){
    if (this.destroyed) return false;
    if (bot.destroyed) return false;

    const playerCenterX = this.pos.x;
    const playerCenterY = this.pos.y;
    const foodCenterX = bot.pos.x;
    const foodCenterY = bot.pos.y;

    const dx = foodCenterX - playerCenterX;
    const dy = foodCenterY - playerCenterY;

    // Compare squared distances
    const distanceSquared = dx * dx + dy * dy;
    const radiusSquared = this.radius * this.radius;

    return distanceSquared <= radiusSquared;
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

      console.log(this.pos.x, this.pos.y)

      this.draw();
    }
  }
}