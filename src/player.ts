import P5 from "p5";
import Circle from "./circle";

const PLAYER_DEFAULT_RADIUS = 80;

export default class Player extends Circle {
  constructor(p5: P5, color: string) {
    const middle = p5.createVector(p5.width/2, p5.height/2)
    super(p5, middle, PLAYER_DEFAULT_RADIUS, color)
  }

  eat(otherCircle: Circle) {
    this.radius += otherCircle.radius;
  }
}
