import P5 from "p5";
import Circle from "./circle";

const PLAYER_DEFAULT_RADIUS = 80;

export default class Player extends Circle {
  constructor(p5: P5, color: string) {
    const middle = p5.createVector(p5.width / 2, p5.height / 2)
    super(p5, middle, PLAYER_DEFAULT_RADIUS, color)
  }

  eat(otherCircle: Circle) {
    this.radius += otherCircle.radius;
  }

  // Esta función mueve el el circulo del jugador en la dirección en la que se encuentra el ratón.
  // Renta como hemos dicho el mover para cada jugador el tablero en posición contraria a la que se encuentra 
  // el ratón, es decir si nos movemos en positivo en X y en Y, ovemos el tablero en -X y en -Y.  
  move(){

    var mouse = this.p5.createVector(this.p5.mouseX, this.p5.mouseY); 
    mouse.sub(this.position);
    mouse.setMag(5);
    this.position.add(mouse);
  }
}
