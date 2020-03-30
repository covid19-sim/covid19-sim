
//Fetch our canvas
let canvas = document.getElementById('world');

const CANVAS_HEIGHT = 800;
const CANVAS_WIDTH = 800;
const WALL_WIDTH = 5;
const MAX_DIST_FORCE = 100;

const distance_f = (a,b) => {
    return Math.sqrt(Math.pow(a.x - b.x, 2) +  Math.pow(a.y - b.y, 2));
}

// setup KDTree
let TREE = new kdTree([], distance_f, ["x", "y"]);

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
		const rx = Math.floor( (CANVAS_WIDTH - 2*r) * Math.random()) + r;
		const ry = Math.floor( (CANVAS_HEIGHT - 2*r) * Math.random()) + r;
		const rvx = 3 * 2 * (Math.random() - 0.5);
		const rvy = 3 * 2 * (Math.random() - 0.5);
		// let rx, ry, rvx, rvy;
		// if (i === 0) {
		// 	rx = 100;
		// 	ry = 400;
		// 	rvx = 2;
		// 	rvy = 0;
		// }
		// else {
		// 	rx = 400;
		// 	ry = 400;
		// 	rvx = -2;
		// 	rvy = 0;
		// }
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
	const dist = Math.sqrt((b1['x'] - b2['x'])**2 + (b1['y'] - b2['y'])**2);
	if (dist === 0) {
		return Matter.Vector.create(0, 0);
	}
	const vdir = Matter.Vector.create(b1['x'] - b2['x'], b1['y'] - b2['y']); // points away from b2
	const constant = 50/10000; // 5 pixels = 0.001 in the opposite direction
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

Matter.Events.on(engine, "beforeUpdate", update)

const balls = create_balls(500, 5);
const walls = create_walls();
Matter.World.add(world, balls);
Matter.World.add(world, walls);

window.addEventListener('load', function() {
    //Start the engine
    Matter.Engine.run(engine);
    Matter.Render.run(render);
});



