// module aliases
var Engine = Matter.Engine,
    Render = Matter.Render,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Runner = Matter.Runner;

//constants
const RADIUS = 5;
const BALL_COUNT = 50;
const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 800;
const MAIN_BOX_WIDTH = 800;
const MAIN_BOX_HEIGHT = 800;
const WALL_THICKNESS = 10;
const MAX_INITIAL_VELOCITY = 2;
const WALL_COLLISION_SCALER = 50/100000;
const MIN_COLLISION_VELOCITY = 2;

const CENTRAL_LOCATION_LENGTH = 20; // rectangle length
const CENTRAL_LOCATION_DELAY = 60; // frames per check
const CENTRAL_LOCATION_VELOCITY = 5;

const STATUS = {
      'HEALTHY': 'blue',
      'INFECTED': 'yellow',
      'RECOVERED': 'green',
      'DEAD': 'black'
};

const INITIAL_INFECTED = 1;
const MAX_TRANSMISSION_DISTANCE = 40;
const TRANSMISSION_PROBABILITY = 0.05;
const RETRANSMISSION_PROBABILITY = 0.01;

const INCUBATION_MEAN = 120; // frames
const INCUBATION_STD = 30; // frames
const DECISION_MEAN = 240; // frames
const DECISION_STD = 30; // frames
const LETHAL_PROBABILITY = 0.03

// will be input from user
const SOCIAL_DISTANCING_FCONSTANT = 10/1000; // 50/1000;
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

const getRandomInWalls = (walls) => {
  // walls listed in top, bottom, left, right order
  ymax = walls[1]['position']['y'] - WALL_THICKNESS;
  ymin = walls[0]['position']['y'] + WALL_THICKNESS;
  xmax = walls[3]['position']['x'] - WALL_THICKNESS;
  xmin = walls[2]['position']['x'] + WALL_THICKNESS;
  return [getRandomIntInclusive(xmin, xmax), getRandomIntInclusive(ymin, ymax)];
}

// Standard Normal variate using Box-Muller transform.
function getRandomGauss() {
  var u = 0, v = 0;
  while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while(v === 0) v = Math.random();
  return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

// Create Walls centered at any cx, cy with width and height
const createWalls = (cx, cy, width, height) => {
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
  topWall = Bodies.rectangle(cx, cy - height/2 + WALL_THICKNESS/2, width, WALL_THICKNESS, wallOptions);
  bottomWall = Bodies.rectangle(cx, cy + height/2 - WALL_THICKNESS/2, width, WALL_THICKNESS, wallOptions);
  leftWall = Bodies.rectangle(cx - width/2 + WALL_THICKNESS/2, cy, WALL_THICKNESS, height, wallOptions);
  rightWall = Bodies.rectangle(cx + width/2 - WALL_THICKNESS/2, cy, WALL_THICKNESS, height, wallOptions);
  // console.log(topWall);
  return [topWall, bottomWall, leftWall, rightWall];
}

const createBalls = () => {
  let balls = [];
  for (var i = 0; i < BALL_COUNT; i++) {
    const res = getRandomInWalls(MAIN_WALLS);
    const x = res[0];
    const y = res[1];
    const vx = MAX_INITIAL_VELOCITY * getRandomArbitrary(-1, 1);
    const vy = MAX_INITIAL_VELOCITY * getRandomArbitrary(-1, 1);
    // let x = i === 0 ? 200 : 400;
    // let y = 200;
    // let vx = i === 0 ? 1.5 : -1.5;
    // let vy = 0;

    const ballOptions = {
            render: {
              fillStyle: STATUS['HEALTHY'],
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

    // ADDITIONAL PROPERTIES
    ball.goToCentral = undefined;
    if (i < INITIAL_INFECTED) {
      // initial infected balls
      ball.virusState = 'INFECTED';
      ball.render.fillStyle = STATUS['INFECTED'];
      ball.will_survive = Math.random() > LETHAL_PROBABILITY;
    }
    else {
      ball.virusState = 'HEALTHY';
      ball.will_survive = true; // when the ball gets infected, this will be set
    }
    ball.counter_frames = 0; // frames while having virus but not showing symptoms
    ball.necessary_frames = getRandomGauss() * INCUBATION_STD + INCUBATION_MEAN;
    ball.necessary_frames = Math.ceil(ball.necessary_frames);
    if (ball.necessary_frames < INCUBATION_MEAN - INCUBATION_STD * 2) {
      ball.necessary_frames = INCUBATION_MEAN - INCUBATION_STD * 2; // minimum
    }
    ball.box = 'main'; // 'main', 'isolation', or 'dead'
  }
  return balls;
}

const create_central_location = (cx, cy) => {
  let centralOpts = {
    render: {
      fillStyle: 'black',
      lineWidth: 0,
    },
    isStatic: true, 
    friction: 0, 
    frictionAir: 0, 
    frictionStatic: 0
  };
  const central = Bodies.rectangle(cx - CENTRAL_LOCATION_LENGTH/2, cy - CENTRAL_LOCATION_LENGTH/2, CENTRAL_LOCATION_LENGTH, CENTRAL_LOCATION_LENGTH, centralOpts);
  // turns off collisions
  central.collisionFilter = {
    'group': -1,
    'category': 2,
    'mask': 0,
  };
  CENTRAL_LOCATIONS.push(central);
  // console.log(central);
  World.add(engine.world, central);
};

const remove_central_location = (idx) => {
  const central = CENTRAL_LOCATIONS[idx];
  CENTRAL_LOCATIONS.splice(idx, 1);
  World.remove(engine.world, central);
}

const handle_ball_to_central_location = (body) => {
  if (CENTRAL_LOCATIONS.length === 0) {
    return;
  }
  const position = body.position;
  if (body.goToCentral === undefined) {
    if (FRAME_COUNT % CENTRAL_LOCATION_DELAY != 0) {
      return;
    }
    let idx = -1;
    for (let j = 0; j < CENTRAL_LOCATIONS.length; j++) {
      if (Math.random() < P_TO_CENTRAL_LOCATION) {
        idx = j; // chose j
        break;
      }
    }
    if (idx == -1) {
      return; // none chosen
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


// Gets distance between two (x,y) points
const distance_f = (a,b) => {
  return Math.sqrt(Math.pow(a.x - b.x, 2) +  Math.pow(a.y - b.y, 2));
}

const compute_fv = (body1, body2) => {
  const b1 = body1['position'];
  const b2 = body2['position'];
	const dist = distance_f(b1, b2);
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
		TREE.insert(balls[i]);
	}
}

const clean_tree = () => {
	for (let i = 0; i < balls.length; i++) {
		TREE.remove(balls[i]);
	}
}

const handle_virus_transmission = (body1, body2) => {
  // transmit virus with some p FROM body1 to body2 IF body1 has it AND body 2 does not
  if (body1.virusState === 'HEALTHY' || body1.virusState === 'RECOVERED' || body2.virusState === 'INFECTED') {
    return ;
  }
  if (distance_f(body1['position'], body2['position']) < MAX_TRANSMISSION_DISTANCE) {
    const gets_infected = body2.virusState === 'RECOVERED' ? Math.random() < RETRANSMISSION_PROBABILITY : Math.random() < TRANSMISSION_PROBABILITY;
    if (!gets_infected) {
      return ;
    }
    body2.virusState = 'INFECTED';
    body2.render.fillStyle = STATUS['INFECTED'];
    body2.will_survive = Math.random() > LETHAL_PROBABILITY; // predetermined fate, the puritans had it right
  }
}

const handle_wall_collision = () => {
  // checks all walls for all collisions
  const top_f = Matter.Vector.create(0, -1 * WALL_COLLISION_SCALER);
  const bottom_f = Matter.Vector.create(0, 1 * WALL_COLLISION_SCALER);
  const left_f = Matter.Vector.create(1 * WALL_COLLISION_SCALER, 0);
  const right_f = Matter.Vector.create(-1 * WALL_COLLISION_SCALER, 0);
  const vectors = [top_f, bottom_f, left_f, right_f];
  for (let k = 0; k < ALL_WALLS.length; k++) {
    walls = ALL_WALLS[k];
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
}

const handle_incubation = (body) => {
  // returns true if body moved to isolation
  if (body.virusState != 'INFECTED' && body.box == 'main') {
    return false; // not infected and in main
  }
  else if (body.box === 'dead') {
    return false; // already dead
  }
  body.counter_frames += 1;
  if (body.counter_frames != body.necessary_frames) {
    return false;
  }

  if (body.box === 'main') {
    // in main and got infected
    const res = getRandomInWalls(INCUBATION_WALLS);
    const x = res[0];
    const y = res[1];
    Matter.Body.setPosition(body, {'x': x, 'y': y}); // move to incubation
    Matter.Body.setVelocity(body, {'x': getRandomIntInclusive(-2, 2), 'y': getRandomIntInclusive(-2, 2)});

    // clear attributes
    body.goToCentral = undefined;
    body.counter_frames = 0;
    body.necessary_frames = getRandomGauss() * DECISION_STD + DECISION_MEAN;
    body.necessary_frames = Math.ceil(body.necessary_frames);
    if (body.necessary_frames < DECISION_MEAN - DECISION_STD * 2) {
      body.necessary_frames = DECISION_MEAN - DECISION_STD * 2; // minimum
    }
    body.box = 'isolation';
  }
  else {
    // in incubation and either recovered or died
    let res, x, y;
    if (body.will_survive === false) {
      // RIP
      res = getRandomInWalls(DEAD_WALLS);
      x = res[0];
      y = res[1];
      Matter.Body.setPosition(body, {'x': x, 'y': y}); // move to dead
      Matter.Body.setVelocity(body, {'x': 0, 'y': 0}); // dead people dont move :(
      body.virusState = 'DEAD';
      body.render.fillStyle = STATUS['DEAD'];
      body.box = 'dead';
      return true;
    }
    // recovered :)
    res = getRandomInWalls(MAIN_WALLS);
    x = res[0];
    y = res[1];
    Matter.Body.setPosition(body, {'x': x, 'y': y}); // move to incubation
    Matter.Body.setVelocity(body, {'x': getRandomIntInclusive(-2, 2), 'y': getRandomIntInclusive(-2, 2)});

    // clear attributes
    body.goToCentral = undefined;
    body.counter_frames = 0;
    body.necessary_frames = getRandomGauss() * INCUBATION_STD + INCUBATION_MEAN;
    body.necessary_frames = Math.ceil(body.necessary_frames);
    if (body.necessary_frames < INCUBATION_MEAN - INCUBATION_STD * 2) {
      body.necessary_frames = INCUBATION_MEAN - INCUBATION_STD * 2; // minimum
    }
    body.virusState = 'RECOVERED';
    body.render.fillStyle = STATUS['RECOVERED'];
    body.box = 'main';
  }
  return true;
}

const update = () => {
  update_tree();
	for (let i = 0; i < balls.length; i++) {
    const body = balls[i];
    if (handle_incubation(body)) {
      continue; // moved to isolation
    }
    if (body.box != 'main') {
      continue;
    }
    handle_ball_to_central_location(body);
    const should_distance = body.goToCentral !== undefined;
		const matches = TREE.nearest(body, 10, 100); // max nodes: 10, distance: 100
		if (matches.length <= 1) {
			// there can be one match, the ball itself
			continue;
    }
    // console.log("MATCH:", matches[0]);
    let fv = compute_fv(body, matches[0][0]);
    handle_virus_transmission(body, matches[0][0]);
		for (let j = 1; j < matches.length; j++) {
      handle_virus_transmission(body, matches[j][0]);
      if (should_distance) {
        fv = Matter.Vector.add(fv, compute_fv(body, matches[j][0]));
      }
		}
		Matter.Body.applyForce(body, body.position, fv);
	}
  clean_tree();
  
  handle_wall_collision();
  FRAME_COUNT += 1;
}

// add all of the bodies to the world
const MAIN_WALLS = createWalls(400, 400, MAIN_BOX_WIDTH, MAIN_BOX_HEIGHT); // main box
const INCUBATION_WALLS = createWalls(1000, 200, 200, 200); // isolation box
const DEAD_WALLS = createWalls(1000, 600, 200, 200); // isolation box
const ALL_WALLS = [MAIN_WALLS, INCUBATION_WALLS, DEAD_WALLS];
const balls = createBalls();
World.add(engine.world, MAIN_WALLS);
World.add(engine.world, INCUBATION_WALLS);
World.add(engine.world, DEAD_WALLS);
World.add(engine.world, balls);
create_central_location(400, 400);

// setup KDTree
let TREE = new kdTree([], distance_f, 'position', ['x', 'y']);

Matter.Events.on(engine, "beforeUpdate", update);

window.addEventListener('load', function() {
  //Start the engine
  Engine.run(engine);
  Render.run(render);
});
