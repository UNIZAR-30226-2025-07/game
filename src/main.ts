import { Application } from "pixi.js";
import './style.css'
import { Player } from "./player";
import { generateRandomFood } from "./food";

(async () => {
  const app = new Application({
    antialias: true,
    autoDensity: true,
    resolution: 2,
  });

  await app.init({ background: '#ffffff', resizeTo: window })

  document.body.appendChild(app.canvas)

  //const maxVelocity = Math.sqrt(app.screen.width*app.screen.width/4 + app.screen.height*app.screen.height/4);

  /// PLAYER
  const player = new Player(app.screen.width / 2, app.screen.height / 2, 80, 0x44bb44);
  app.stage.addChild(player);

  /// FOOD
  const food = generateRandomFood(80, app.screen.width, app.screen.height);
  food.forEach(f => app.stage.addChild(f));

  app.ticker.add(() => {
    // Move the player towards the mouse
    const pointer = app.renderer.events.pointer;
    player.moveTowards(pointer.x, pointer.y);
  });
})();
