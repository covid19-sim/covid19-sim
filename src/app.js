// module aliases
var Engine = Matter.Engine,
    Render = Matter.Render,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Runner = Matter.Runner;

//constants
const RADIUS = 5;
const WIDTH = 800;
const HEIGHT = 800;
const TIME_DUR = 10 * 1000;

// create an engine
const engine = Engine.create();
engine.world.gravity.scale = 0;

// create a renderer
const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
      height: HEIGHT,
      width: WIDTH,
      background: 'transparent',
    },
});

// Create a Runner
const runner = Runner.create();

// Gets random integers within a certain range
function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}


var bodies = []
// Create Walls
topWall = Bodies.rectangle(400,1, 800,1, {isStatic: true});
bottomWall = Bodies.rectangle(400,799, 800,1, {isStatic: true});
leftWall = Bodies.rectangle(1, 400, 1, 800, {isStatic: true});
rightWall = Bodies.rectangle(799, 400, 1, 800, {isStatic: true});
bodies.push(topWall, bottomWall, leftWall, rightWall);

// Create circles
for (var i = 0; i < 2000; i++) {
  const x = getRandomIntInclusive(RADIUS, WIDTH-RADIUS);
  const y = getRandomIntInclusive(RADIUS, HEIGHT-RADIUS);
  const circle = Bodies.circle(x, y, RADIUS);
  const vx = 5 * getRandomArbitrary(-1, 1);
  const vy = 5 * getRandomArbitrary(-1, 1);
  const velocity = {x: vx, y: vy};
  Matter.Body.setVelocity(circle, velocity);
  bodies.push(circle);
}

// add all of the bodies to the world
World.add(engine.world, bodies);

// run the engine
Engine.run(engine);

// run the renderer
Render.run(render);

// let start = null;

// function run(timestamp) {
//   if (!start) start = timestamp;
//   var progress = timestamp - start;
//   Engine.update(engine, 1000/60);
//   console.log("hi");
  
//   if (progress < TIME_DUR) {
//     window.requestAnimationFrame(run);
//   }
// }

// window.requestAnimationFrame(run);
