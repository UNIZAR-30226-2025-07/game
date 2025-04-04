import { Application, Container, Graphics/*, Point, RenderLayer */} from "pixi.js";
import './style.css'
import { Player } from "./player";
import { generateRandomFood } from "./food";
import { Bot } from "./bot"

(async () => {
  const app = new Application({
    antialias: true,
    autoDensity: true,
    resolution: 2,
  });

  await app.init({ background: '#ffffff', resizeTo: window })

  document.body.appendChild(app.canvas)

  const worldDimensions: WorldBounds = {
    width: 8000,
    height: 8000,
  }

  const world = new Container();
  app.stage.addChild(world);

  const worldBounds = new Graphics()
    .rect(0, 0, worldDimensions.width, worldDimensions.height)
    .stroke({ width: 4, color: 0x0 });

  world.addChild(worldBounds)

  /// PLAYER
  const randomX = Math.floor(Math.random() * worldDimensions.width)
  const randomY = Math.floor(Math.random() * worldDimensions.height)
  const player = new Player(worldDimensions, randomX, randomY, 80, 0x44bb44);
  player.zIndex = 2;
  world.addChild(player);

  /// FOOD
  const food = generateRandomFood(800, world.width, world.height);
  food.forEach(f => world.addChild(f));

  /// BOTS
  const bots: Bot[] = [];
  for(let i=0; i<5; i++){
    const botX = Math.floor(Math.random() * worldDimensions.width);
    const botY = Math.floor(Math.random() * worldDimensions.height);
    const botRadius = Math.floor(Math.random() * 40) + 40;
    const botColor = Math.random() * 0xffffff;
    const bot = new Bot(worldDimensions, botX, botY, botRadius, botColor);
    bots.push(bot);
    world.addChild(bot);
  }


  app.ticker.add(() => {
    // Move the player towards the mouse
    const pointer = app.renderer.events.pointer;
    player.moveTowards(app.screen, pointer.x, pointer.y);

    const lerpSpeed = 0.02;

    // Calculate zoom based in player radius
    const zoom = player.baseRadius / player.radius;

    // scale world
    world.scale.x += (zoom - world.scale.x) * lerpSpeed
    world.scale.y += (zoom - world.scale.y) * lerpSpeed

    // Translate the world to keep the player in the middle
    const targetX = app.screen.width/2-player.pos.x * world.scale.x;
    const targetY = app.screen.height/2-player.pos.y * world.scale.y;

    world.x += (targetX - world.x) * lerpSpeed;
    world.y += (targetY - world.y) * lerpSpeed;
  });

  app.ticker.add(() => {
    if (player.destroyed) {
      window.location.replace("/")
    }
    // Colission handeling
    // For now, check every food object and if anyone is on top of the player, eat it.
    food.forEach(f => {
      if (player.canEatFood(f)) {
        player.eatFood(f);
      }
    });

    // Comprobar si el jugador puede comer bot
    bots.forEach(b => {
      if (player.canEatBot(b)){
        player.eatBot(b);
      }
    });

    bots.forEach(bot => {
      // Comprobar si el bot puede comer food
      if (!bot.destroyed) {
        food.forEach(f => {
          if (bot.canEatFood(f)){
            bot.eatFood(f);
          }
        });

        bots.forEach(otherBot => {
          // Comprobar si no es sí mismo
          if (bot !== otherBot){
            // Comprobar si puede comer otro bot
            if (bot.canEatBot(otherBot)) {
              bot.eatBot(otherBot);
            }
          }
        });

        // Comprobar si puede comer jugador
        if (bot.canEatPlayer(player)){
          bot.eatPlayer(player);
        }        


        // Buscar objetivo para el bot. Si hay objetivo, va hacia él
        // Si no, movimiento aleatorio
        let target = bot.findTarget(food, bots, [player],);
        if (target !== null) {
          bot.moveTowards(app.screen, target.x, target.y);
        }
        else{
          let x = Math.floor(Math.random() * worldDimensions.width);
          let y = Math.floor(Math.random() * worldDimensions.height);
          bot.moveTowards(app.screen, x, y);
        }
      }
    });
  });

})();
