import { Graphics, Rectangle, Sprite, Assets, Container, Text, TextStyle } from 'pixi.js';
import { Food, FOOD_RADIUS } from './food';

export class Player extends Container {
  public id: Uint8Array;
  public radius: number;
  public color: number;
  public skin: string;
  public pos: { x: number; y: number };
  private worldBounds: WorldBounds;
  public skinSprite: Sprite | null = null;
  private graphics: Graphics;
  private velocityMagnitude: number;
  private nameText: Text; // Texto para el nombre del jugador
  public username: string; // Nombre del jugador

  constructor(worldBounds: WorldBounds, id: Uint8Array, x: number, y: number, radius: number, color: number, skin: string, username: string = "Desconocido") {
    super();
      this.worldBounds = worldBounds;
      this.id = id;
      this.username = username;
      this.radius = radius;
      this.color = color;
      this.pos = { x, y };
      this.velocityMagnitude = 5; // Valor inicial para la velocidad
      this.username = username;
      this.skin = skin;
      
      // Crear el objeto Graphics para dibujar el jugador
      this.graphics = new Graphics();
      this.addChild(this.graphics);
      
      // Crear y configurar el texto del nombre
      this.nameText = new Text(this.username, new TextStyle({
          fontSize: 16,
          fill: 0xffffff,
          fontWeight: 'bold',
          stroke: 0x000000,
          align: 'center',
      }));
      this.nameText.anchor.set(0.5);
      this.addChild(this.nameText);
      
      this.updateSkin(skin);
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

  public setUsername(username: string) {
    this.username = username;
    this.nameText.text = username;
  }

  private draw() {
    if (this.destroyed) return;

    //this.clear();
      //this.circle(this.pos.x, this.pos.y, this.radius);
      //this.fill(this.color);
      //this.stroke({ width: 3, color: 0x0 });
      
    // Dibujar el círculo del jugador
    this.graphics.clear();
    this.graphics.lineStyle(3, 0x000000);
    this.graphics.beginFill(this.color);
    this.graphics.drawCircle(this.pos.x, this.pos.y, this.radius);
    this.graphics.endFill();
    
    // Actualizar posición del nombre según el tamaño del jugador
    this.nameText.position.set(this.pos.x, this.pos.y + this.radius + 15);
    
    // Ajustar el tamaño de la fuente según el radio del jugador
    this.nameText.style.fontSize = Math.max(16, Math.min(this.radius / 3, 50));
  }

  // Actualización desde el servidor
  public async updateFromServer(x: number, y: number, radius: number, color: number, skin: string, username?: string) {
      this.pos.x = x;
      this.pos.y = y;
      this.radius = radius;
      this.color = color;
      this.position.set(x, y); // Actualiza la posición del contenedor
      
      // Actualizar username si se proporciona
      if (username) {
        this.setUsername(username);
      }
      
      if (skin != this.skin) {
        await this.updateSkin(skin);
      }
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
