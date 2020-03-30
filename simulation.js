
//Fetch our canvas
let canvas = document.getElementById('world');

const CANVAS_HEIGHT = 800;
const CANVAS_WIDTH = 800;
const WALL_WIDTH = 5;
const MAX_DIST_FORCE = 100; 

//Setup Matter JS
let engine = Matter.Engine.create();
let world = engine.world;
world.gravity.y = 0; // disable gravity
let render = Matter.Render.create({
	canvas: canvas,
	engine: engine,
	options: {
		width: CANVAS_WIDTH,
		height: CANVAS_HEIGHT,
		background: 'transparent',
		wireframes: false,
		showAngleIndicator: false
	}
});

const create_balls = (num, r) => {
	// generates NUM balls with radius r at random x,y
	// x: distance from left wall, y: distance from top wall (on canvas)
	// TODO: random color?, random force
	let balls = [];
	for (let i = 0; i < num; i++) {
		// const rx = Math.floor( (CANVAS_WIDTH - 2*r) * Math.random()) + r;
		// const ry = Math.floor( (CANVAS_HEIGHT - 2*r) * Math.random()) + r;
		// const rvx = 3 * 2 * (Math.random() - 0.5);
		// const rvy = 3 * 2 * (Math.random() - 0.5);
		let rx, ry, rvx, rvy;
		if (i === 0) {
			rx = 100;
			ry = 400;
			rvx = 2;
			rvy = 0;
		}
		else {
			rx = 400;
			ry = 400;
			rvx = -2;
			rvy = 0;
		}
		const rv = {'x': rvx, 'y': rvy};
		let nb = Matter.Bodies.circle(rx, ry, r, {
			render : {
				fillStyle: '#F35e66',
				strokeStyle: 'black',
				lineWidth: 1
			},
			restitution : 1,
			frictionAir : 0,
			friction : 0,
			frictionStatic : 0,
			inertia : Infinity
		});
		balls.push(nb);
		Matter.Body.setVelocity(nb, rv);
	}
	return balls;
}

const create_walls = () => {
	//Add a floor
	// TODO: color, walls are super jank
	const floor_l = Matter.Bodies.rectangle(0, 0, WALL_WIDTH, 2*CANVAS_HEIGHT, {
		isStatic: true, //An immovable object
		render: {
			fillStyle: '#F35e66',
			lineWidth: 0
		},
	});

	const floor_t = Matter.Bodies.rectangle(WALL_WIDTH, 0, 2*CANVAS_WIDTH - WALL_WIDTH, WALL_WIDTH, {
		isStatic: true, //An immovable object
		render: {
			fillStyle: '#F35e66',
			lineWidth: 0
		}
	});

	const floor_r = Matter.Bodies.rectangle(CANVAS_WIDTH - WALL_WIDTH, WALL_WIDTH, WALL_WIDTH, 2*CANVAS_HEIGHT - WALL_WIDTH, {
		isStatic: true, //An immovable object
		render: {
			fillStyle: '#F35e66',
			lineWidth: 0
		}
	});

	const floor_b = Matter.Bodies.rectangle(0, CANVAS_HEIGHT - WALL_WIDTH, 2*CANVAS_WIDTH - WALL_WIDTH, WALL_WIDTH, {
		isStatic: true, //An immovable object
		render: {
			fillStyle: '#F35e66',
			lineWidth: 0
		}
	});

	return [floor_l, floor_t, floor_r, floor_b];
}

const compute_fv = (b1, b2) => {
	const dist = Math.sqrt((b1.position['x'] - b2.position['x'])**2 + (b1.position['y'] - b2.position['y'])**2);
	if (dist === 0) {
		return Matter.Vector.create(0, 0);
	}
	const vdir = Matter.Vector.create(b1.position['x'] - b2.position['x'], b1.position['y'] - b2.position['y']); // points away from b2
	const constant = 25/10000; // 5 pixels = 0.001 in the opposite direction
	return Matter.Vector.mult(vdir, constant/(dist**2));
}

const update = () => {
	for (let i = 0; i < balls.length; i++) {
		const b = balls[i];
		const x = b.position['x'];
		const y = b.position['y'];
		const tl = {'x': x - MAX_DIST_FORCE / 2, 'y': y - MAX_DIST_FORCE / 2};
		const tr = {'x': x + MAX_DIST_FORCE / 2, 'y': y - MAX_DIST_FORCE / 2};
		const br = {'x': x + MAX_DIST_FORCE / 2, 'y': y + MAX_DIST_FORCE / 2};
		const bl = {'x': x - MAX_DIST_FORCE / 2, 'y': y + MAX_DIST_FORCE / 2};

		const vs = Matter.Vertices.create([tl, tr, br, bl], b);
		const bs = Matter.Bounds.create(vs);
		
		const matches = Matter.Query.region(balls, bs);
		if (matches.length <= 1) {
			// there can be one match, the ball itself
			continue;
		}
		console.log("had over 1 match");
		let fv = compute_fv(b, matches[0]);
		for (let j = 1; j < matches.length; j++) {
			fv = Matter.Vector.add(fv, compute_fv(b, matches[j]));
			console.log('fv, body:', fv, i);
		}
		Matter.Body.applyForce(b, b.position, fv);
	}
}

// Matter.Events.on(engine, "beforeUpdate", update)

const balls = create_balls(2000, 5);
const walls = create_walls();
Matter.World.add(world, balls);
Matter.World.add(world, walls);

window.addEventListener('load', function() {
    //Start the engine
    Matter.Engine.run(engine);
    Matter.Render.run(render);
});



