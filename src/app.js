// module aliases
var Engine = Matter.Engine,
    Render = Matter.Render,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Runner = Matter.Runner;

//constants
const RADIUS = 5;
const BALL_COUNT = 500;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 800;
const WALL_THICKNESS = 10;
const MAX_INITIAL_VELOCITY = 2;
const WALL_COLLISION_SCALER = 50/100000;
const MIN_COLLISION_VELOCITY = 2;
const SOCIAL_DISTANCING_CONSTANT = 50/1000;

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
      wireframes: false, 
      showAngleIndicator: false,
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
    render: {
      fillStyle: '#F35e66',
      lineWidth: 0,
    },
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
    const vx = MAX_INITIAL_VELOCITY * getRandomArbitrary(-1, 1);
    const vy = MAX_INITIAL_VELOCITY * getRandomArbitrary(-1, 1);
    // let x = i === 0 ? 200 : 400;
    // let y = 200;
    // let vx = i === 0 ? 1.5 : -1.5;
    // let vy = 0;

    const ballOptions = {
            render: {
              fillStyle: '#F35e66',
              strokeStyle: 'black',
              lineWidth: 1,
            },
            inertia: Infinity, 
            restitution: 1, 
            friction: 0, 
            frictionAir: 0, 
            frictionStatic: 0
          };
    const ball = Bodies.circle(x, y, RADIUS, ballOptions);
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
  vdir = Matter.Vector.div(vdir, dist) // converts to a unit vector
  // const constant = 100;
	return Matter.Vector.mult(vdir, SOCIAL_DISTANCING_CONSTANT/(dist**2));
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

const handle_wall_collision = () => {
  const top_f = Matter.Vector.create(0, -1 * WALL_COLLISION_SCALER);
  const bottom_f = Matter.Vector.create(0, 1 * WALL_COLLISION_SCALER);
  const left_f = Matter.Vector.create(1 * WALL_COLLISION_SCALER, 0);
  const right_f = Matter.Vector.create(-1 * WALL_COLLISION_SCALER, 0);
  const vectors = [top_f, bottom_f, left_f, right_f];
  for (let i = 0; i < walls.length; i++) {
    const bodies = Matter.Query.collides(walls[i], balls);
    for (let j = 0; j < bodies.length; j++) {
      const body = bodies[j]['bodyB'];
      if (Matter.Vector.magnitude(body.velocity) >= MIN_COLLISION_VELOCITY) {
        continue;
      }
      Matter.Body.applyForce(body, body.position, vectors[i]);
    }
  }
}

const update = () => {
  update_tree();
	for (let i = 0; i < balls.length; i++) {
		const body = balls[i];
    const b = body.position;
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
  
  handle_wall_collision();
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
