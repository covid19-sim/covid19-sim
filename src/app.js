// module aliases
var Engine = Matter.Engine,
    Render = Matter.Render,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Runner = Matter.Runner;

//constants
const RADIUS = 5;
const BALL_COUNT = 50;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 800;
const WALL_THICKNESS = 10;
const MAX_INITIAL_VELOCITY = 2;
const WALL_COLLISION_SCALER = 50/100000;
const MIN_COLLISION_VELOCITY = 2;
const CENTRAL_LOCATION_LENGTH = 20; // rectangle length
const CENTRAL_LOCATION_DELAY = 60; // frames per check
const CENTRAL_LOCATION_VELOCITY = 5;

// will be input from user
const SOCIAL_DISTANCING_FCONSTANT = 50/1000;
const P_TO_CENTRAL_LOCATION = 0.05 // translates to every X frames, Y% chance per central location

let FRAME_COUNT = 0;
let CENTRAL_LOCATIONS = [];

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
    ball.goToCentral = undefined;
  }
  return balls;
}

const create_central_location = (cx, cy) => {
  let centralOpts = {
    render: {
      fillStyle: '#F35e66',
      lineWidth: 0,
    },
    isStatic: true, 
    friction: 0, 
    frictionAir: 0, 
    frictionStatic: 0
  };
  const central = Bodies.rectangle(cx - CENTRAL_LOCATION_LENGTH/2, cy - CENTRAL_LOCATION_LENGTH/2, CENTRAL_LOCATION_LENGTH, CENTRAL_LOCATION_LENGTH, create_central_location);
  // turns off collisions
  central.collisionFilter = {
    'group': -1,
    'category': 2,
    'mask': 0,
  };
  CENTRAL_LOCATIONS.push(central);
  console.log(central);
  World.add(engine.world, central);
};

const remove_central_location = (idx) => {
  const central = CENTRAL_LOCATIONS[idx];
  CENTRAL_LOCATIONS.splice(idx, 1);
  World.remove(engine.world, central);
}

create_central_location(400, 400);

const handle_balls_to_central_location = () => {
  if (CENTRAL_LOCATIONS.length === 0) {
    return;
  }
  for (let i = 0; i < balls.length; i++) {
    const body = balls[i];
    const position = body.position;
    if (body.goToCentral === undefined) {
      if (FRAME_COUNT % CENTRAL_LOCATION_DELAY != 0) {
        continue;
      }
      let idx = -1;
      for (let j = 0; j < CENTRAL_LOCATIONS.length; j++) {
        if (Math.random() < P_TO_CENTRAL_LOCATION) {
          idx = j; // chose j
          break;
        }
      }
      if (idx == -1) {
        continue; // none chosen
      }
      // send this ball to a random central location
      const chosen_location = CENTRAL_LOCATIONS[idx];
      body.goToCentral = chosen_location;
      const centerx = chosen_location['position']['x'] + CENTRAL_LOCATION_LENGTH / 2;
      const centery = chosen_location['position']['y'] + CENTRAL_LOCATION_LENGTH / 2;
      const vdir = Matter.Vector.normalise(Matter.Vector.create(centerx - position['x'], centery - position['y']));
      const vv = Matter.Vector.mult(vdir, CENTRAL_LOCATION_VELOCITY);
      Matter.Body.setVelocity(body, vv);
      // console.log("moving", i, " to central location");
    }
    else {
      // ball is either going to central location or already there
      const location = body.goToCentral;
      const centerx = location['position']['x'] + CENTRAL_LOCATION_LENGTH / 2;
      const centery = location['position']['y'] + CENTRAL_LOCATION_LENGTH / 2;
      const dist = Math.sqrt(Math.pow(centerx - position['x'], 2) +  Math.pow(centery - position['y'], 2));
      if (dist < 40) {
        // count it as reaching
        body.goToCentral = undefined;
      }
      else if (FRAME_COUNT % 5 === 0) {
        // give it another boost
        const vdir = Matter.Vector.normalise(Matter.Vector.create(centerx - position['x'], centery - position['y']));
        const vv = Matter.Vector.mult(vdir, CENTRAL_LOCATION_VELOCITY);
        Matter.Body.setVelocity(body, vv);
      }
    }
  }
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
	return Matter.Vector.mult(vdir, SOCIAL_DISTANCING_FCONSTANT/(dist**2));
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
  handle_balls_to_central_location();

  update_tree();
	for (let i = 0; i < balls.length; i++) {
    const body = balls[i];
    if (body.goToCentral !== undefined) {
      continue; // going to central location
    }
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
  FRAME_COUNT += 1;
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
