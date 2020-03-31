// module aliases
var Engine = Matter.Engine,
    Render = Matter.Render,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Runner = Matter.Runner;

//constants
const RADIUS = 5;
const BALL_COUNT = 10;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 800;
const WALL_THICKNESS = 20;
const VEL_MULT = 6;

// create an engine
const engine = Engine.create();
engine.world.gravity.scale = 0;

// create a renderer
const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
      height: CANVAS_HEIGHT,
      width: CANVAS_WIDTH,
      background: 'transparent',
    },
});

// Gets random integers within a certain range
const getRandomIntInclusive = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const getRandomArbitrary = (min, max) => {
  return Math.random() * (max - min) + min;
}

// Create Walls
const createWalls = () => {
  let wallOptions = {
    inertia: Infinity, 
    restitution: 1, 
    isStatic: true, 
    friction: 0, 
    frictionAir: 0, 
    frictionStatic: 0
  };
  topWall = Bodies.rectangle(CANVAS_WIDTH/2, WALL_THICKNESS/2, CANVAS_WIDTH, WALL_THICKNESS, wallOptions);
  bottomWall = Bodies.rectangle(CANVAS_WIDTH/2, CANVAS_HEIGHT- WALL_THICKNESS/2, CANVAS_WIDTH, WALL_THICKNESS, wallOptions);
  leftWall = Bodies.rectangle(WALL_THICKNESS/2, CANVAS_HEIGHT/2, WALL_THICKNESS, CANVAS_HEIGHT, wallOptions);
  rightWall = Bodies.rectangle(CANVAS_WIDTH- WALL_THICKNESS/2, CANVAS_HEIGHT/2, WALL_THICKNESS, CANVAS_HEIGHT, wallOptions);
  return [topWall, bottomWall, leftWall, rightWall];
}

const createBalls = () => {
  let balls = [];
  for (var i = 0; i < BALL_COUNT; i++) {
    const x = getRandomIntInclusive(RADIUS+WALL_THICKNESS, CANVAS_WIDTH-WALL_THICKNESS-RADIUS);
    const y = getRandomIntInclusive(RADIUS+WALL_THICKNESS, CANVAS_HEIGHT-WALL_THICKNESS-RADIUS);
    const ballOptions = {
            inertia: Infinity, 
            restitution: 1, 
            friction: 0, 
            frictionAir: 0, 
            frictionStatic: 0
          };
    const ball = Bodies.circle(x, y, RADIUS, ballOptions);
    const vx = VEL_MULT * getRandomArbitrary(-1, 1);
    const vy = VEL_MULT * getRandomArbitrary(-1, 1); 
    const velocity = {x: vx, y: vy};
    Matter.Body.setVelocity(ball, velocity);
    balls.push(ball);
  }
  return balls;
}

// Gets distance between two (x,y) points
const distance_f = (a,b) => {
  return Math.sqrt(Math.pow(a.x - b.x, 2) +  Math.pow(a.y - b.y, 2));
}

const compute_fv = (b1, b2) => {
	const dist = Math.sqrt((b1['x'] - b2['x'])**2 + (b1['y'] - b2['y'])**2);
	if (dist === 0) {
		return Matter.Vector.create(0, 0);
	}
  let vdir = Matter.Vector.create(b1['x'] - b2['x'], b1['y'] - b2['y']); // points away from b2
  // const constant = 50/10000; // 5 pixels = 0.001 in the opposite direction
  vdir = Matter.Vector.normalize(vdir); // converts to a unit vector
  const constant = 100;
	return Matter.Vector.mult(vdir, constant/(dist**2));
}

const update_tree = () => {
	for (let i = 0; i < balls.length; i++) {
		TREE.insert(balls[i].position);
	}
}

const clean_tree = () => {
	for (let i = 0; i < balls.length; i++) {
		TREE.remove(balls[i].position);
	}
}

const update = () => {
  update_tree();
	for (let i = 0; i < balls.length; i++) {
		const body = balls[i];
		const b = body.position
		const matches = TREE.nearest(b, 10, 100);
		if (matches.length <= 1) {
			// there can be one match, the ball itself
			continue;
		}
		let fv = compute_fv(b, matches[0][0]);
		for (let j = 1; j < matches.length; j++) {
			fv = Matter.Vector.add(fv, compute_fv(b, matches[j][0]));
		}
		Matter.Body.applyForce(body, b, fv);
	}
	clean_tree();
}

// add all of the bodies to the world
const walls = createWalls();
const balls = createBalls();
World.add(engine.world, walls);
World.add(engine.world, balls);

// setup KDTree
let TREE = new kdTree([], distance_f, ["x", "y"]);

Matter.Events.on(engine, "beforeUpdate", update);

window.addEventListener('load', function() {
  //Start the engine
  Engine.run(engine);
  Render.run(render);
});
