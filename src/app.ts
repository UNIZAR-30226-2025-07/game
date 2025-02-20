import P5 from "p5";
//import "p5/lib/addons/p5.sound";	// Include if needed

// DEMO: A sample class implementation
import Circle from "./circle";
import Player from "./player";

function randomVector(maxX: number, maxY: number): P5.Vector {
  const x = Math.floor(Math.random() * maxX)
  const y = Math.floor(Math.random() * maxY)
  return new P5.Vector(x, y);
}

function randomColor(): string {
  const colors = ["blue", "red", "yellow", "green"];
  return colors[Math.floor(Math.random() * colors.length)]
}

// Creating the sketch itself
const sketch = (p5: P5) => {
  // DEMO: Prepare an array of MyCircle instances
  const buffer: Circle[] = [];

  // The sketch setup method 
  p5.setup = () => {
    // Creating and positioning the canvas
    const canvas = p5.createCanvas(p5.windowWidth, p5.windowHeight);
    canvas.parent("app");

    // Configuring the canvas
    p5.background("black");

    const player = new Player(p5, "white");

    // Generate motes
    for (let i = 0; i < 50; i++) {
      let mote = new Circle(p5, randomVector(p5.width, p5.height), 12, randomColor())
      buffer.push(mote);
    }

    buffer.push(player);
  };

  // The sketch draw method
  p5.draw = () => {
    buffer.forEach(circle => circle.draw());
    // p5.translate( -Blob.pos.x, -Blob.pos.y);
    // En la anterior lo de dentro del parentesis hay que mirar con exactitud a que se referencia 
  };

  p5.windowResized = () => {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight)
    p5.background("black");
    buffer.forEach(circle => circle.draw());
  }
};

new P5(sketch);
